import { useMemo } from 'react';
import { useStore } from './store';

export const ACCENTS = {
  green: '#3DFF7A',
  blue: '#33E1FF',
} as const;

const BASE = {
  bg: '#050807',
  surface: '#0A0F0D',
  text: '#D3DDD8',
  dim: '#66756E',
  faint: '#252E2A',
  danger: '#FF5370',
  warn: '#FFCB6B',
};

/** #RRGGBB + alpha → #RRGGBBAA (supported by React Native). */
export const alpha = (hex: string, a: number) =>
  hex +
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');

export type Palette = typeof BASE & {
  accent: string;
  line: string;
  glow: string;
  tint: string;
  tintStrong: string;
};

export function usePalette(): Palette {
  const kind = useStore((s) => s.settings.accent);
  return useMemo(() => {
    const accent = ACCENTS[kind];
    return {
      ...BASE,
      accent,
      line: alpha(accent, 0.22),
      glow: alpha(accent, 0.7),
      tint: alpha(accent, 0.07),
      tintStrong: alpha(accent, 0.2),
    };
  }, [kind]);
}

/** Loaded in App.tsx via @expo-google-fonts/jetbrains-mono.
 *  On Android, glyphs missing from the font (e.g. Persian in notes) fall back to the system font. */
export const FONT = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  bold: 'JetBrainsMono_700Bold',
};
