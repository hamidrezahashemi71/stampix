import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useStore } from '../store';
import { CategorySheet, TemplateSheet } from '../sheets';
import { usePalette } from '../theme';
import { dateStr } from '../time';
import type { AccentKind, CalendarKind, ID } from '../types';
import { Btn, Chip, H, Input, T, useKeyboardHeight, useNow } from '../ui';

const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const };

function Line({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <T size={12} style={{ marginBottom: 6 }}>
        {k} =
      </T>
      <View style={row}>{children}</View>
    </View>
  );
}

export function ConfigScreen() {
  const P = usePalette();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const categories = useStore((s) => s.categories);
  const nSessions = useStore((s) => s.sessions.length);
  const nStamps = useStore((s) => s.stamps.length);

  const [editCat, setEditCat] = useState<ID | 'new' | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [shortcutsText, setShortcutsText] = useState(settings.shortcuts.join(', '));
  const [shortcutsFocused, setShortcutsFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!shortcutsFocused || keyboardHeight === 0) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, shortcutsFocused]);

  const saveShortcuts = () => {
    const list = Array.from(
      new Set(
        shortcutsText
          .split(/[,\n]/)
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    );
    setSettings({ shortcuts: list });
  };

  const today = useNow(60_000);
  const calendars: CalendarKind[] = ['gregorian', 'jalali'];
  const accents: AccentKind[] = ['green', 'blue'];

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: 14, paddingBottom: keyboardHeight + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <T dim size={12}>
        $ cat ~/.tstamprc
      </T>

      <H>display</H>
      <Line k="calendar">
        {calendars.map((c) => (
          <Chip
            key={c}
            label={`${c}  ${dateStr(today, c)}`}
            on={settings.calendar === c}
            onPress={() => setSettings({ calendar: c })}
          />
        ))}
      </Line>
      <Line k="accent">
        {accents.map((a) => (
          <Chip key={a} label={a} on={settings.accent === a} onPress={() => setSettings({ accent: a })} />
        ))}
      </Line>

      <Line k="live_timer">
        <Chip label="on" on={settings.showTimer} onPress={() => setSettings({ showTimer: true })} />
        <Chip label="off" on={!settings.showTimer} onPress={() => setSettings({ showTimer: false })} />
      </Line>

      <H>sessions</H>
      <Line k="auto_close_idle_after">
        {[2, 4, 8, 12].map((h) => (
          <Chip
            key={h}
            label={`${h}h`}
            on={settings.autoCloseHours === h}
            onPress={() => setSettings({ autoCloseHours: h })}
          />
        ))}
      </Line>

      <H>categories</H>
      {categories.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => setEditCat(c.id)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: P.faint,
            marginBottom: 6,
            backgroundColor: pressed ? P.tint : 'transparent',
          })}
        >
          <T accent bold size={13} style={{ flex: 1 }}>
            {c.name}
          </T>
          <T dim size={12}>
            {c.checkpoints.length ? `${c.checkpoints.length} cp` : 'free'} ›
          </T>
        </Pressable>
      ))}
      <View style={[row, { marginTop: 6 }]}>
        <Btn small label="[ + new ]" onPress={() => setEditCat('new')} style={{ marginRight: 8 }} />
        <Btn small label="[ + template ]" onPress={() => setTplOpen(true)} />
      </View>

      <H>shortcuts</H>
      <Input
        value={shortcutsText}
        onChangeText={setShortcutsText}
        onFocus={() => setShortcutsFocused(true)}
        onBlur={() => {
          setShortcutsFocused(false);
          saveShortcuts();
        }}
        onSubmitEditing={saveShortcuts}
        autoCapitalize="none"
        placeholder="traffic, rain, …"
      />
      <T dim size={11} style={{ marginTop: 6 }}>
        comma-separated · append to the label when editing a stamp
      </T>

      <H>data</H>
      <T size={12}>
        {nSessions} sessions · {nStamps} stamps · stored on device
      </T>
      <T dim size={11} style={{ marginTop: 6 }}>
        export / import → coming next
      </T>

      <H>about</H>
      <T dim size={12}>
        tstamp v0.1.1
      </T>

      <CategorySheet id={editCat} onClose={() => setEditCat(null)} />
      <TemplateSheet visible={tplOpen} onClose={() => setTplOpen(false)} />
    </ScrollView>
  );
}
