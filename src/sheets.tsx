import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useStore } from './store';
import { TEMPLATES } from './templates';
import { clock, dateStr, weekday } from './time';
import type { ID } from './types';
import { Btn, Chip, Input, Sheet, T } from './ui';
import { usePalette } from './theme';

const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const };

// ───────────────────────── stamp editor ─────────────────────────

/** Edit label / time / tags / note of a stamp. Closing the sheet saves. */
export function StampSheet(props: { id: ID | null; onClose: () => void }) {
  // `key` remounts the editor per stamp, so its local state starts fresh.
  return <StampEditor key={props.id ?? '-'} {...props} />;
}

function StampEditor({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const st = useStore((s) => (id ? s.stamps.find((x) => x.id === id) : undefined));
  const quickTags = useStore((s) => s.settings.quickTags);
  const cal = useStore((s) => s.settings.calendar);
  const updateStamp = useStore((s) => s.updateStamp);
  const deleteStamp = useStore((s) => s.deleteStamp);

  const [label, setLabel] = useState(st?.label ?? '');
  const [note, setNote] = useState(st?.note ?? '');
  const [tags, setTags] = useState<string[]>(st?.tags ?? []);
  const [at, setAt] = useState(st?.at ?? 0);

  const save = () => {
    if (st) updateStamp(st.id, { label: label.trim() || st.label, note: note.trim(), tags, at });
    onClose();
  };

  const remove = () =>
    Alert.alert('delete stamp?', st ? `${clock(st.at)} · ${st.label}` : '', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          if (st) deleteStamp(st.id);
          onClose();
        },
      },
    ]);

  const toggleTag = (t: string) => setTags((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));
  const shift = (min: number) => setAt((v) => v + min * 60_000);

  return (
    <Sheet visible={!!st} title="edit stamp" onClose={save}>
      {st ? (
        <View>
          <T dim size={12}>
            {weekday(at)} {dateStr(at, cal)}
            {at !== st.at ? '   (modified)' : ''}
          </T>
          <T accent glow bold size={30} style={{ marginVertical: 6 }}>
            {clock(at)}
          </T>
          <View style={[row, { marginBottom: 8 }]}>
            {[-5, -1, 1, 5].map((m) => (
              <Btn
                key={m}
                small
                tone="dim"
                label={`${m > 0 ? '+' : ''}${m}m`}
                onPress={() => shift(m)}
                style={{ marginRight: 8 }}
              />
            ))}
          </View>

          <T dim size={12} style={{ marginTop: 6, marginBottom: 6 }}>
            label
          </T>
          <Input value={label} onChangeText={setLabel} autoCapitalize="none" />

          <T dim size={12} style={{ marginTop: 12, marginBottom: 6 }}>
            tags
          </T>
          <View style={row}>
            {quickTags.map((t) => (
              <Chip key={t} label={`#${t}`} on={tags.includes(t)} onPress={() => toggleTag(t)} />
            ))}
          </View>

          <T dim size={12} style={{ marginTop: 6, marginBottom: 6 }}>
            note
          </T>
          <Input value={note} onChangeText={setNote} multiline placeholder="…" style={{ minHeight: 72 }} />

          <View style={[row, { marginTop: 14, justifyContent: 'space-between' }]}>
            <Btn label="[ save ]" onPress={save} style={{ flex: 1, marginRight: 10 }} />
            <Btn label="[ del ]" tone="danger" onPress={remove} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

// ───────────────────────── session actions ─────────────────────────

export function SessionSheet({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const sess = useStore((s) => (id ? s.sessions.find((x) => x.id === id) : undefined));
  const categories = useStore((s) => s.categories);
  const activeId = useStore((s) => s.activeSessionId);
  const setSessionCategory = useStore((s) => s.setSessionCategory);
  const reopenSession = useStore((s) => s.reopenSession);
  const closeActive = useStore((s) => s.closeActive);
  const deleteSession = useStore((s) => s.deleteSession);

  const remove = () =>
    Alert.alert('delete session?', 'all its stamps will be removed.', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          if (sess) deleteSession(sess.id);
          onClose();
        },
      },
    ]);

  return (
    <Sheet visible={!!sess} title="session" onClose={onClose}>
      {sess ? (
        <View>
          <T dim size={12} style={{ marginBottom: 8 }}>
            category
          </T>
          <View style={row}>
            <Chip label="none" on={sess.categoryId === null} onPress={() => setSessionCategory(sess.id, null)} />
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                on={sess.categoryId === c.id}
                onPress={() => setSessionCategory(sess.id, c.id)}
              />
            ))}
          </View>
          <View style={[row, { marginTop: 12 }]}>
            {activeId === sess.id ? (
              <Btn
                label="[ end session ]"
                onPress={() => {
                  closeActive();
                  onClose();
                }}
                style={{ flex: 1, marginRight: 10 }}
              />
            ) : (
              <Btn
                label="[ reopen ]"
                onPress={() => {
                  reopenSession(sess.id);
                  onClose();
                }}
                style={{ flex: 1, marginRight: 10 }}
              />
            )}
            <Btn label="[ del ]" tone="danger" onPress={remove} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

// ───────────────────────── category editor ─────────────────────────

export function CategorySheet(props: { id: ID | 'new' | null; onClose: () => void }) {
  return <CategoryEditor key={props.id ?? '-'} {...props} />;
}

function CategoryEditor({ id, onClose }: { id: ID | 'new' | null; onClose: () => void }) {
  const cat = useStore((s) => (id && id !== 'new' ? s.categories.find((c) => c.id === id) : undefined));
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [name, setName] = useState(cat?.name ?? '');
  const [cps, setCps] = useState(cat?.checkpoints.join('\n') ?? '');

  const save = () => {
    const n = name.trim().toLowerCase();
    const list = cps
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!n) return onClose();
    if (cat) updateCategory(cat.id, { name: n, checkpoints: list });
    else addCategory(n, list);
    onClose();
  };

  const remove = () =>
    Alert.alert(`delete "${cat?.name}"?`, 'its sessions become uncategorized.', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          if (cat) deleteCategory(cat.id);
          onClose();
        },
      },
    ]);

  return (
    <Sheet visible={id !== null} title={cat ? `edit ${cat.name}` : 'new category'} onClose={onClose}>
      <T dim size={12} style={{ marginBottom: 6 }}>
        name
      </T>
      <Input value={name} onChangeText={setName} autoCapitalize="none" placeholder="e.g. reading" />
      <T dim size={12} style={{ marginTop: 12, marginBottom: 6 }}>
        checkpoints — one per line, in order (empty = free stamps)
      </T>
      <Input
        value={cps}
        onChangeText={setCps}
        multiline
        autoCapitalize="none"
        placeholder={'start\nhalfway\ndone'}
        style={{ minHeight: 120 }}
      />
      <View style={[row, { marginTop: 14 }]}>
        <Btn label="[ save ]" onPress={save} style={{ flex: 1, marginRight: cat ? 10 : 0 }} />
        {cat ? <Btn label="[ del ]" tone="danger" onPress={remove} /> : null}
      </View>
    </Sheet>
  );
}

// ───────────────────────── templates ─────────────────────────

export function TemplateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const P = usePalette();
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);

  const add = (name: string, cps: string[]) => {
    const taken = new Set(categories.map((c) => c.name));
    let n = name;
    for (let i = 2; taken.has(n); i++) n = `${name}-${i}`;
    addCategory(n, [...cps]);
    onClose();
  };

  return (
    <Sheet visible={visible} title="add from template" onClose={onClose}>
      {TEMPLATES.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => add(t.name, t.checkpoints)}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: P.faint,
            backgroundColor: pressed ? P.tintStrong : 'transparent',
            padding: 12,
            marginBottom: 8,
          })}
        >
          <T accent bold>
            + {t.name}
            <T dim size={12}>
              {'  '}
              {t.checkpoints.length ? `${t.checkpoints.length} cp` : 'free'} · {t.hint}
            </T>
          </T>
          {t.checkpoints.length ? (
            <T dim size={11} style={{ marginTop: 4 }} numberOfLines={1}>
              {t.checkpoints.join(' → ')}
            </T>
          ) : null}
        </Pressable>
      ))}
    </Sheet>
  );
}
