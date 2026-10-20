import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View, Vibration } from 'react-native';
import { categoryStats, nextLabel, stampsOf, useStore } from '../store';
import { StampSheet } from '../sheets';
import { usePalette } from '../theme';
import { clock, dayKey, dur, durShort, hm } from '../time';
import type { ID, Stamp } from '../types';
import { Btn, Chip, Cursor, Hr, T, useNow } from '../ui';

const TOAST_MS = 5000;

export function LogScreen() {
  const P = usePalette();
  const categories = useStore((s) => s.categories);
  const sessions = useStore((s) => s.sessions);
  const stamps = useStore((s) => s.stamps);
  const activeId = useStore((s) => s.activeSessionId);
  const stamp = useStore((s) => s.stamp);
  const startSession = useStore((s) => s.startSession);
  const closeActive = useStore((s) => s.closeActive);
  const undoStamp = useStore((s) => s.undoStamp);

  const showTimer = useStore((s) => s.settings.showTimer);
  // Tick every second only while the live timer is shown.
  const now = useNow(showTimer ? 1000 : 30_000);
  const [editId, setEditId] = useState<ID | null>(null);
  const [toast, setToast] = useState<{ id: ID; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const active = sessions.find((x) => x.id === activeId);
  const cat = categories.find((c) => c.id === active?.categoryId);
  const list = useMemo(() => (active ? stampsOf(stamps, active.id) : []), [stamps, active]);
  const next = active ? nextLabel(cat, list.length) : 'cp1';
  const runNo = active ? sessions.filter((x) => x.categoryId === active.categoryId).length : 0;
  const stats = useMemo(
    () => (active ? categoryStats(active.categoryId, sessions, stamps, categories) : null),
    [active, sessions, stamps, categories],
  );

  const announce = (st: Stamp) => {
    Vibration.vibrate(25);
    const closed = useStore.getState().activeSessionId === null;
    setToast({ id: st.id, text: `${clock(st.at)} · ${st.label}${closed ? ' · ■ end' : ''}` });
  };

  const onStamp = (close = false) => announce(stamp({ close }));

  const onStart = (categoryId: ID) => {
    if (active && active.categoryId === categoryId) return onStamp();
    if (active) {
      Alert.alert(
        'session running',
        `end "${cat?.name ?? 'free'}" and start "${categories.find((c) => c.id === categoryId)?.name}"?`,
        [
          { text: 'cancel', style: 'cancel' },
          { text: 'start', onPress: () => announce(startSession(categoryId)) },
        ],
      );
      return;
    }
    announce(startSession(categoryId));
  };

  const first = list[0];
  const last = list[list.length - 1];
  const total = cat?.checkpoints.length ?? 0;

  // Today's finished sessions, shown while idle.
  const todayKey = dayKey(now);
  const today = useMemo(() => {
    if (active) return [];
    const k = todayKey;
    return sessions
      .filter((x) => x.closedAt !== null)
      .map((sess) => ({ sess, l: stampsOf(stamps, sess.id) }))
      .filter((x) => x.l.length && dayKey(x.l[0].at) === k)
      .sort((a, b) => b.l[0].at - a.l[0].at)
      .map(({ sess, l }) => {
        const c = categories.find((cc) => cc.id === sess.categoryId);
        const st = categoryStats(sess.categoryId, sessions, stamps, categories);
        return {
          id: sess.id,
          name: c?.name ?? 'free',
          from: l[0].at,
          span: l[l.length - 1].at - l[0].at,
          med: st.median,
        };
      });
  }, [active, sessions, stamps, categories, todayKey]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        {active && first ? (
          <View style={{ borderWidth: 1, borderColor: P.line, backgroundColor: P.surface, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T color={P.danger} size={12}>
                ●{' '}
              </T>
              <T accent bold size={12} style={{ flex: 1 }} numberOfLines={1}>
                REC [{cat?.name ?? 'free'}] #{runNo}
              </T>
              <T dim size={12}>
                {total ? `${list.length}/${total}` : `${list.length} cp`}
              </T>
            </View>

            {showTimer ? (
              <>
                <T accent glow bold size={46} style={{ marginTop: 8 }}>
                  {dur(now - first.at)}
                </T>
                <T dim size={12}>
                  started {clock(first.at)} · last {dur(now - last.at)} ago
                </T>
              </>
            ) : (
              <T dim size={12} style={{ marginTop: 6 }}>
                started {clock(first.at)}
              </T>
            )}

            <Hr />

            {list.map((st, i) => (
              <Pressable
                key={st.id}
                onPress={() => setEditId(st.id)}
                style={({ pressed }) => ({ paddingVertical: 5, backgroundColor: pressed ? P.tint : 'transparent' })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T dim size={12}>
                    {clock(st.at)}{' '}
                  </T>
                  <T accent size={12}>
                    +{dur(i ? st.at - list[i - 1].at : 0)}{' '}
                  </T>
                  <T size={13} style={{ flex: 1 }} numberOfLines={1}>
                    {st.label}
                  </T>
                  {st.note || st.tags.length ? (
                    <T dim size={12}>
                      {' '}
                      ✎
                    </T>
                  ) : null}
                </View>
                {st.tags.length || st.note ? (
                  <T dim size={11} numberOfLines={1} style={{ marginLeft: 16, marginTop: 2 }}>
                    {st.tags.map((t) => `#${t}`).join(' ')}
                    {st.tags.length && st.note ? ' · ' : ''}
                    {st.note}
                  </T>
                ) : null}
              </Pressable>
            ))}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <T accent size={13}>
                › next: {next}{' '}
              </T>
              <Cursor />
            </View>

            {stats && stats.n > 0 && stats.median != null && stats.mean != null ? (
              <T dim size={11} style={{ marginTop: 10 }}>
                median {durShort(stats.median)} · avg {durShort(stats.mean)} · n={stats.n}
              </T>
            ) : null}
          </View>
        ) : (
          <View style={{ borderWidth: 1, borderColor: P.faint, padding: 14 }}>
            <T dim size={12}>
              $ tstamp --status
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <T size={13}>idle. no active session </T>
              <Cursor />
            </View>
            <T dim size={12} style={{ marginTop: 10, lineHeight: 18 }}>
              tap a category to start a run,{'\n'}or STAMP for a free session.
            </T>
          </View>
        )}

        {today.length ? (
          <View style={{ marginTop: 16 }}>
            <T dim size={12} style={{ marginBottom: 6 }}>
              ── today ──
            </T>
            {today.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                <T dim size={12}>
                  {hm(r.from)}{' '}
                </T>
                <T size={12} style={{ flex: 1 }} numberOfLines={1}>
                  [{r.name}]
                </T>
                {r.med != null ? (
                  <T dim size={11}>
                    med {durShort(r.med)}{' '}
                  </T>
                ) : null}
                <T accent bold size={13}>
                  {dur(r.span)}
                </T>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ── bottom controls (thumb zone) ── */}
      <View style={{ paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderColor: P.faint }}>
        {toast ? (
          <View
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: '100%',
              marginBottom: 8,
              borderWidth: 1,
              borderColor: P.accent,
              backgroundColor: P.surface,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 12,
            }}
          >
            <T size={12} style={{ flex: 1 }} numberOfLines={1}>
              ✓ {toast.text}
            </T>
            <Pressable
              onPress={() => {
                undoStamp(toast.id);
                setToast(null);
              }}
              hitSlop={8}
              style={{ paddingVertical: 10, paddingHorizontal: 12 }}
            >
              <T accent bold size={12}>
                UNDO
              </T>
            </Pressable>
          </View>
        ) : null}

        <T dim size={11} style={{ marginBottom: 6 }}>
          quick start ›
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} on={active?.categoryId === c.id} onPress={() => onStart(c.id)} />
          ))}
        </ScrollView>

        {active ? (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <Btn
              small
              tone="dim"
              label="[ note last ]"
              onPress={() => last && setEditId(last.id)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Btn small tone="dim" label="[ end session ]" onPress={closeActive} style={{ flex: 1 }} />
          </View>
        ) : null}

        <Pressable
          onPress={() => onStamp(false)}
          onLongPress={() => active && onStamp(true)}
          delayLongPress={450}
          style={({ pressed }) => ({
            borderWidth: 1.5,
            borderColor: P.accent,
            backgroundColor: pressed ? P.tintStrong : P.tint,
            paddingVertical: 18,
            alignItems: 'center',
            marginBottom: 10,
          })}
        >
          <T accent glow bold size={24}>
            [ STAMP ]
          </T>
          <T accent size={12} style={{ marginTop: 4 }} numberOfLines={1}>
            › {active ? next : 'new free session'}
          </T>
          {active ? (
            <T dim size={10} style={{ marginTop: 3 }}>
              hold = stamp + end
            </T>
          ) : null}
        </Pressable>
      </View>

      <StampSheet id={editId} onClose={() => setEditId(null)} />
    </View>
  );
}
