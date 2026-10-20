import React, { useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useHydrated, useStore } from './src/store';
import { usePalette } from './src/theme';
import { dateStr, hm, weekday } from './src/time';
import { T, useNow } from './src/ui';
import { LogScreen } from './src/screens/LogScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ConfigScreen } from './src/screens/ConfigScreen';

type Tab = 'log' | 'hist' | 'conf';
const TABS: Tab[] = ['log', 'hist', 'conf'];

export default function App() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold });
  const hydrated = useHydrated();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded && hydrated ? <Shell /> : <View style={{ flex: 1, backgroundColor: '#050807' }} />}
    </SafeAreaProvider>
  );
}

function Shell() {
  const P = usePalette();
  const insets = useSafeAreaInsets();
  const cal = useStore((s) => s.settings.calendar);
  const activeId = useStore((s) => s.activeSessionId);
  const closeStale = useStore((s) => s.closeStale);
  const [tab, setTab] = useState<Tab>('log');
  const now = useNow(15_000);

  // Close forgotten sessions on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    closeStale();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && closeStale());
    return () => sub.remove();
  }, [closeStale]);

  return (
    <View style={{ flex: 1, backgroundColor: P.bg, paddingTop: insets.top }}>
      {/* prompt line */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: P.faint,
        }}
      >
        <T size={12} style={{ flex: 1 }} numberOfLines={1}>
          <T accent bold size={12}>
            tstamp
          </T>
          <T dim size={12}>
            @android:
          </T>
          <T accent size={12}>
            ~/{tab}
          </T>
          <T dim size={12}>
            {' '}
            $
          </T>
        </T>
        <T dim size={12}>
          {weekday(now)} {dateStr(now, cal)}
        </T>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'log' ? <LogScreen /> : tab === 'hist' ? <HistoryScreen /> : <ConfigScreen />}
      </View>

      {/* tmux-style status bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: P.tint,
          borderTopWidth: 1,
          borderColor: P.line,
          paddingBottom: insets.bottom,
        }}
      >
        <T bold size={12} color={P.bg} style={{ backgroundColor: P.accent, paddingHorizontal: 8, paddingVertical: 10 }}>
          [ts]
        </T>
        {TABS.map((t, i) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            hitSlop={4}
            style={{ paddingHorizontal: 10, paddingVertical: 10 }}
          >
            <T size={12} bold={tab === t} accent={tab === t} dim={tab !== t}>
              {i}:{t}
              {tab === t ? '*' : ' '}
            </T>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        {activeId ? (
          <T size={12} color={P.danger}>
            ●{' '}
          </T>
        ) : null}
        <T size={12} accent style={{ paddingRight: 10 }}>
          {hm(now)}
        </T>
      </View>
    </View>
  );
}
