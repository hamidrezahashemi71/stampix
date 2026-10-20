import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { FONT, usePalette } from './theme';

/** Floor for the bottom gap when the platform reports no inset (e.g. 3-button nav inside a Modal). */
const MIN_BOTTOM_GAP = 16;

// ───────────────────────── hooks ─────────────────────────

/** Re-renders every `ms` and returns the current time. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Height of the soft keyboard (0 when hidden). Works with Android edge-to-edge. */
export function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}

// ───────────────────────── text ─────────────────────────

type TProps = TextProps & {
  size?: number;
  bold?: boolean;
  dim?: boolean;
  accent?: boolean;
  glow?: boolean;
  color?: string;
};

/** Monospace text in the terminal palette. */
export function T({ size = 13, bold, dim, accent, glow, color, style, ...rest }: TProps) {
  const P = usePalette();
  const c = color ?? (accent ? P.accent : dim ? P.dim : P.text);
  const base: TextStyle = {
    fontFamily: bold ? FONT.bold : FONT.regular,
    fontSize: size,
    color: c,
    includeFontPadding: false,
  };
  const glowStyle: TextStyle | null = glow
    ? { textShadowColor: P.glow, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }
    : null;
  return <Text {...rest} style={[base, glowStyle, style]} />;
}

/** Blinking block cursor. */
export function Cursor({ size = 13 }: { size?: number }) {
  const P = usePalette();
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <T size={size} color={on ? P.accent : 'transparent'}>
      █
    </T>
  );
}

// ───────────────────────── controls ─────────────────────────

type BtnProps = Omit<PressableProps, 'style'> & {
  label: string;
  tone?: 'accent' | 'dim' | 'danger';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Bracketed terminal button: [ label ] */
export function Btn({ label, tone = 'accent', small, style, ...rest }: BtnProps) {
  const P = usePalette();
  const c = tone === 'danger' ? P.danger : tone === 'dim' ? P.dim : P.accent;
  return (
    <Pressable
      hitSlop={6}
      {...rest}
      style={({ pressed }) => [
        {
          borderWidth: 1,
          borderColor: tone === 'dim' ? P.faint : c,
          backgroundColor: pressed ? P.tintStrong : 'transparent',
          paddingVertical: small ? 6 : 10,
          paddingHorizontal: small ? 10 : 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <T size={small ? 12 : 13} bold color={c}>
        {label}
      </T>
    </Pressable>
  );
}

/** Toggle chip: [x] label */
export function Chip({
  label,
  on,
  onPress,
  onLongPress,
}: {
  label: string;
  on?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const P = usePalette();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={4}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: on ? P.accent : P.faint,
        backgroundColor: pressed ? P.tintStrong : on ? P.tint : 'transparent',
        paddingVertical: 7,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
      })}
    >
      <T size={12} color={on ? P.accent : P.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const P = usePalette();
  return (
    <TextInput
      placeholderTextColor={P.dim}
      cursorColor={P.accent}
      selectionColor={P.tintStrong}
      {...props}
      style={[
        {
          fontFamily: FONT.regular,
          fontSize: 14,
          color: P.text,
          borderWidth: 1,
          borderColor: P.faint,
          backgroundColor: P.bg,
          paddingHorizontal: 10,
          paddingVertical: 8,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        props.style,
      ]}
    />
  );
}

/** Section heading styled like a comment line. */
export function H({ children }: { children: string }) {
  return (
    <T size={12} dim style={{ marginTop: 18, marginBottom: 8 }}>
      # {children}
    </T>
  );
}

export function Hr() {
  const P = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: P.line, marginVertical: 10 }} />;
}

// ───────────────────────── sheet ─────────────────────────

/** Bottom sheet that stays above the keyboard. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const outer = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* On Android a Modal is its own window: measure its insets with a nested provider,
          so the sheet never slides under the system navigation buttons. */}
      <SafeAreaProvider>
        <SheetBody title={title} onClose={onClose} outer={outer}>
          {children}
        </SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetBody({
  title,
  onClose,
  outer,
  children,
}: {
  title: string;
  onClose: () => void;
  outer: EdgeInsets;
  children: React.ReactNode;
}) {
  const P = usePalette();
  const inner = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const bottom = Math.max(inner.bottom, outer.bottom, MIN_BOTTOM_GAP);
  const top = Math.max(inner.top, outer.top);
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: '#000000AA' }} />
      </Pressable>
      <View
        style={{
          maxHeight: '85%',
          backgroundColor: P.surface,
          borderTopWidth: 1,
          borderColor: P.accent,
          paddingBottom: (kb ? kb : bottom) + 12,
          marginTop: top,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 6 }}>
          <T size={13} accent bold style={{ flex: 1 }} numberOfLines={1}>
            ── {title} ──
          </T>
          <Pressable onPress={onClose} hitSlop={12}>
            <T size={13} dim>
              [esc]
            </T>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6 }}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
