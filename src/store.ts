import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category, ID, Session, Settings, Stamp } from './types';
import { DEFAULT_QUICK_TAGS, SEED_TEMPLATE_KEYS, TEMPLATES } from './templates';
import { mean, median } from './time';

export const uid = (): ID => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ───────────────────────── pure helpers ─────────────────────────

/** Stamps of one session, oldest first. */
export function stampsOf(stamps: Stamp[], sessionId: ID): Stamp[] {
  return stamps.filter((s) => s.sessionId === sessionId).sort((a, b) => a.at - b.at);
}

/** Label for the next stamp: the next checkpoint of the template, or cpN. */
export function nextLabel(cat: Category | undefined, count: number): string {
  if (cat && count < cat.checkpoints.length) return cat.checkpoints[count];
  return `cp${count + 1}`;
}

/** A session counts as complete if it is closed and, when it has a template,
 *  every checkpoint was stamped. Only complete sessions feed the averages. */
export function isComplete(sess: Session, list: Stamp[], cat: Category | undefined): boolean {
  if (sess.closedAt == null || list.length < 2) return false;
  if (cat && cat.checkpoints.length > 0) return list.length >= cat.checkpoints.length;
  return true;
}

export interface CatStats {
  n: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
}

export function categoryStats(
  categoryId: ID | null,
  sessions: Session[],
  stamps: Stamp[],
  categories: Category[],
): CatStats {
  const cat = categories.find((c) => c.id === categoryId);
  const spans: number[] = [];
  for (const sess of sessions) {
    if (sess.categoryId !== categoryId) continue;
    const list = stampsOf(stamps, sess.id);
    if (!isComplete(sess, list, cat)) continue;
    spans.push(list[list.length - 1].at - list[0].at);
  }
  return {
    n: spans.length,
    median: median(spans),
    mean: mean(spans),
    min: spans.length ? Math.min(...spans) : null,
    max: spans.length ? Math.max(...spans) : null,
  };
}

// ───────────────────────── store ─────────────────────────

interface Data {
  categories: Category[];
  sessions: Session[];
  stamps: Stamp[];
  settings: Settings;
  activeSessionId: ID | null;
}

type StampPatch = Partial<Pick<Stamp, 'label' | 'note' | 'tags' | 'at'>>;
type MoveTarget = { sessionId: ID } | { newCategoryId: ID | null };

interface Actions {
  /** One-tap stamp. Opens a free session if none is active. */
  stamp: (opts?: { close?: boolean }) => Stamp;
  /** Close the current session (if any), open a new one and stamp its first checkpoint. */
  startSession: (categoryId: ID | null) => Stamp;
  closeActive: () => void;
  /** Close the active session if it has been idle longer than settings.autoCloseHours. */
  closeStale: (now?: number) => void;
  undoStamp: (id: ID) => void;
  updateStamp: (id: ID, patch: StampPatch) => void;
  deleteStamp: (id: ID) => void;
  setSessionCategory: (sessionId: ID, categoryId: ID | null) => void;
  reopenSession: (sessionId: ID) => void;
  deleteSession: (sessionId: ID) => void;
  /** Move stamps into an existing session or a new one. Returns the target session id. */
  moveStamps: (ids: ID[], target: MoveTarget) => ID;
  addCategory: (name: string, checkpoints: string[]) => ID;
  updateCategory: (id: ID, patch: Partial<Pick<Category, 'name' | 'checkpoints'>>) => void;
  deleteCategory: (id: ID) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

export type Store = Data & Actions;

const now0 = Date.now();
const initialData: Data = {
  categories: TEMPLATES.filter((t) => SEED_TEMPLATE_KEYS.includes(t.key)).map((t, i) => ({
    id: `seed-${t.key}`,
    name: t.name,
    checkpoints: [...t.checkpoints],
    createdAt: now0 + i,
  })),
  sessions: [],
  stamps: [],
  settings: {
    calendar: 'gregorian',
    accent: 'green',
    autoCloseHours: 4,
    quickTags: DEFAULT_QUICK_TAGS,
  },
  activeSessionId: null,
};

/** Drop sessions that no longer have stamps and fix activeSessionId. */
function prune(sessions: Session[], stamps: Stamp[], active: ID | null) {
  const used = new Set(stamps.map((s) => s.sessionId));
  return {
    sessions: sessions.filter((s) => used.has(s.id)),
    activeSessionId: active && used.has(active) ? active : null,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData,

      stamp: (opts) => {
        get().closeStale();
        const s = get();
        const sid = s.activeSessionId;
        if (!sid) return get().startSession(null);
        const sess = s.sessions.find((x) => x.id === sid)!;
        const cat = s.categories.find((c) => c.id === sess.categoryId);
        const count = s.stamps.filter((x) => x.sessionId === sid).length;
        const now = Date.now();
        const st: Stamp = { id: uid(), sessionId: sid, at: now, label: nextLabel(cat, count), note: '', tags: [] };
        const reachedEnd = !!cat && cat.checkpoints.length > 0 && count + 1 >= cat.checkpoints.length;
        const close = !!opts?.close || reachedEnd;
        set({
          stamps: [...s.stamps, st],
          sessions: close ? s.sessions.map((x) => (x.id === sid ? { ...x, closedAt: now } : x)) : s.sessions,
          activeSessionId: close ? null : sid,
        });
        return st;
      },

      startSession: (categoryId) => {
        const s = get();
        const now = Date.now();
        const cat = categoryId ? s.categories.find((c) => c.id === categoryId) : undefined;
        const prev = s.activeSessionId;
        const sessions = prev ? s.sessions.map((x) => (x.id === prev ? { ...x, closedAt: now } : x)) : s.sessions;
        const singleShot = !!cat && cat.checkpoints.length === 1;
        const sess: Session = {
          id: uid(),
          categoryId: cat ? cat.id : null,
          createdAt: now,
          closedAt: singleShot ? now : null,
        };
        const st: Stamp = { id: uid(), sessionId: sess.id, at: now, label: nextLabel(cat, 0), note: '', tags: [] };
        set({ sessions: [...sessions, sess], stamps: [...s.stamps, st], activeSessionId: singleShot ? null : sess.id });
        return st;
      },

      closeActive: () => {
        const s = get();
        if (!s.activeSessionId) return;
        const id = s.activeSessionId;
        set({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, closedAt: Date.now() } : x)),
          activeSessionId: null,
        });
      },

      closeStale: (now = Date.now()) => {
        const s = get();
        const id = s.activeSessionId;
        if (!id) return;
        const list = s.stamps.filter((x) => x.sessionId === id);
        const last = list.length ? Math.max(...list.map((x) => x.at)) : now;
        if (now - last > s.settings.autoCloseHours * 3600_000) {
          set({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, closedAt: last } : x)), activeSessionId: null });
        }
      },

      undoStamp: (id) => {
        const s = get();
        const st = s.stamps.find((x) => x.id === id);
        if (!st) return;
        const stamps = s.stamps.filter((x) => x.id !== id);
        const remaining = stamps.some((x) => x.sessionId === st.sessionId);
        if (!remaining) {
          set({ stamps, ...prune(s.sessions, stamps, s.activeSessionId) });
          return;
        }
        // Reopen the stamp's session (it may have auto-closed on its last checkpoint),
        // unless another session has become active in the meantime.
        if (s.activeSessionId && s.activeSessionId !== st.sessionId) {
          set({ stamps });
          return;
        }
        set({
          stamps,
          sessions: s.sessions.map((x) => (x.id === st.sessionId ? { ...x, closedAt: null } : x)),
          activeSessionId: st.sessionId,
        });
      },

      updateStamp: (id, patch) => set((s) => ({ stamps: s.stamps.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      deleteStamp: (id) =>
        set((s) => {
          const stamps = s.stamps.filter((x) => x.id !== id);
          return { stamps, ...prune(s.sessions, stamps, s.activeSessionId) };
        }),

      setSessionCategory: (sessionId, categoryId) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, categoryId } : x)) })),

      reopenSession: (sessionId) =>
        set((s) => {
          const now = Date.now();
          const prev = s.activeSessionId;
          return {
            sessions: s.sessions.map((x) =>
              x.id === sessionId ? { ...x, closedAt: null } : x.id === prev ? { ...x, closedAt: now } : x,
            ),
            activeSessionId: sessionId,
          };
        }),

      deleteSession: (sessionId) =>
        set((s) => {
          const stamps = s.stamps.filter((x) => x.sessionId !== sessionId);
          return { stamps, ...prune(s.sessions, stamps, s.activeSessionId) };
        }),

      moveStamps: (ids, target) => {
        const s = get();
        let sessions = s.sessions;
        let targetId: ID;
        if ('sessionId' in target) {
          targetId = target.sessionId;
        } else {
          const moved = s.stamps.filter((x) => ids.includes(x.id));
          const first = moved.length ? Math.min(...moved.map((x) => x.at)) : Date.now();
          const sess: Session = { id: uid(), categoryId: target.newCategoryId, createdAt: first, closedAt: Date.now() };
          sessions = [...sessions, sess];
          targetId = sess.id;
        }
        const stamps = s.stamps.map((x) => (ids.includes(x.id) ? { ...x, sessionId: targetId } : x));
        set({ stamps, ...prune(sessions, stamps, s.activeSessionId) });
        return targetId;
      },

      addCategory: (name, checkpoints) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { id, name, checkpoints, createdAt: Date.now() }] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          sessions: s.sessions.map((x) => (x.categoryId === id ? { ...x, categoryId: null } : x)),
        })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'tstamp/v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Data => ({
        categories: s.categories,
        sessions: s.sessions,
        stamps: s.stamps,
        settings: s.settings,
        activeSessionId: s.activeSessionId,
      }),
      // Keep defaults for settings keys added in later versions.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
  );
}
