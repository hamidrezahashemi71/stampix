import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { stampsOf, useStore } from '../store';
import { SessionSheet, StampSheet } from '../sheets';
import { usePalette } from '../theme';
import { clock, dateStr, dayKey, dur, hm, weekday } from '../time';
import type { ID, Session, Stamp } from '../types';
import { Chip, T } from '../ui';

type Row = { kind: 'day'; key: string; label: string } | { kind: 'session'; key: string; sess: Session; list: Stamp[] };

const ALL = '__all__';
const NONE = '__none__';

export function HistoryScreen() {
  const P = usePalette();
  const categories = useStore((s) => s.categories);
  const sessions = useStore((s) => s.sessions);
  const stamps = useStore((s) => s.stamps);
  const activeId = useStore((s) => s.activeSessionId);
  const cal = useStore((s) => s.settings.calendar);

  const [filter, setFilter] = useState<string>(ALL);
  const [open, setOpen] = useState<Set<ID>>(() => new Set(activeId ? [activeId] : []));
  const [editStamp, setEditStamp] = useState<ID | null>(null);
  const [editSession, setEditSession] = useState<ID | null>(null);

  const catName = (id: ID | null) => categories.find((c) => c.id === id)?.name ?? 'free';

  const rows = useMemo<Row[]>(() => {
    const items = sessions
      .filter((x) => filter === ALL || (filter === NONE ? x.categoryId === null : x.categoryId === filter))
      .map((sess) => ({ sess, list: stampsOf(stamps, sess.id) }))
      .filter((x) => x.list.length > 0)
      .sort((a, b) => b.list[0].at - a.list[0].at);
    const out: Row[] = [];
    let lastDay = '';
    for (const it of items) {
      const t = it.list[0].at;
      const k = dayKey(t);
      if (k !== lastDay) {
        out.push({ kind: 'day', key: `d-${k}`, label: `${weekday(t)} ${dateStr(t, cal)}` });
        lastDay = k;
      }
      out.push({ kind: 'session', key: it.sess.id, sess: it.sess, list: it.list });
    }
    return out;
  }, [sessions, stamps, filter, cal]);

  const toggle = (id: ID) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <T dim size={12} style={{ marginTop: 14, marginBottom: 6 }}>
          ── {item.label} ──
        </T>
      );
    }
    const { sess, list } = item;
    const first = list[0];
    const last = list[list.length - 1];
    const isOpen = open.has(sess.id);
    const live = sess.id === activeId;
    return (
      <View style={{ borderWidth: 1, borderColor: live ? P.accent : P.faint, marginBottom: 8 }}>
        <Pressable
          onPress={() => toggle(sess.id)}
          onLongPress={() => setEditSession(sess.id)}
          style={({ pressed }) => ({ padding: 10, backgroundColor: pressed ? P.tint : 'transparent' })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T accent size={12}>
              {isOpen ? '▾ ' : '▸ '}
            </T>
            <T
              bold
              size={13}
              accent={sess.categoryId !== null}
              dim={sess.categoryId === null}
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              [{catName(sess.categoryId)}]
            </T>
            {live ? (
              <T color={P.danger} size={11}>
                ● rec{' '}
              </T>
            ) : null}
            <T accent bold size={13}>
              {list.length > 1 ? dur(last.at - first.at) : '--:--'}
            </T>
          </View>
          <T dim size={11} style={{ marginTop: 3, marginLeft: 16 }}>
            {hm(first.at)} → {hm(last.at)} · {list.length} stamp{list.length === 1 ? '' : 's'}
          </T>
        </Pressable>
        {isOpen
          ? list.map((st, i) => (
              <Pressable
                key={st.id}
                onPress={() => setEditStamp(st.id)}
                style={({ pressed }) => ({
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderTopWidth: 1,
                  borderColor: P.faint,
                  backgroundColor: pressed ? P.tint : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row' }}>
                  <T dim size={12}>
                    {clock(st.at)}{' '}
                  </T>
                  <T accent size={12}>
                    +{dur(i ? st.at - list[i - 1].at : 0)}{' '}
                  </T>
                  <T size={12} style={{ flex: 1 }} numberOfLines={1}>
                    {st.label}
                  </T>
                </View>
                {st.note ? (
                  <T dim size={11} style={{ marginTop: 2, marginLeft: 16 }}>
                    {st.note}
                  </T>
                ) : null}
              </Pressable>
            ))
          : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="all" on={filter === ALL} onPress={() => setFilter(ALL)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} on={filter === c.id} onPress={() => setFilter(c.id)} />
          ))}
          <Chip label="free" on={filter === NONE} onPress={() => setFilter(NONE)} />
        </ScrollView>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
        ListEmptyComponent={
          <T dim size={12} style={{ marginTop: 24 }}>
            $ ls ~/sessions{'\n'}(empty) — go stamp something.
          </T>
        }
        ListFooterComponent={
          rows.length ? (
            <T dim size={11} style={{ marginTop: 10 }}>
              tap: expand · hold: session actions · tap stamp: edit
            </T>
          ) : undefined
        }
      />
      <StampSheet id={editStamp} onClose={() => setEditStamp(null)} />
      <SessionSheet id={editSession} onClose={() => setEditSession(null)} />
    </View>
  );
}
