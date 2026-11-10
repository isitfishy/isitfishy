import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Shown } from './format';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  dark: false,
  bg: '#f6f8fa',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#59636e',
  border: '#d1d9e0',
  primary: '#1F5BFF',
  // Background of filled buttons under onPrimary text.
  primaryFill: '#1F5BFF',
  onPrimary: '#ffffff',
  chip: '#eef1f4',
  verdict: {
    low: '#1a7f37',
    medium: '#9a6700',
    high: '#cf222e',
    unverified: '#9a6700',
  } as Record<Shown, string>,
  tint: {
    low: '#dafbe1',
    medium: '#fff8c5',
    high: '#ffebe9',
    unverified: '#fff8c5',
  } as Record<Shown, string>,
};

type Palette = typeof light;

export type Theme = Palette & {
  /** A font size or line height, enlarged when large text is on. */
  font: (size: number) => number;
};

const dark: Palette = {
  dark: true,
  bg: '#0d1117',
  surface: '#161b22',
  text: '#e6edf3',
  muted: '#9198a1',
  border: '#30363d',
  primary: '#6F95FF',
  // Background of filled buttons under onPrimary text.
  primaryFill: '#1F5BFF',
  onPrimary: '#ffffff',
  chip: '#21262d',
  verdict: { low: '#3fb950', medium: '#d29922', high: '#f85149', unverified: '#d29922' },
  tint: { low: '#12261e', medium: '#272115', high: '#2d1517', unverified: '#272115' },
};

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const KEY = 'isitfishy.theme.v1';
const TEXT_KEY = 'isitfishy.largeText.v1';

/** How much bigger large text makes every font; the phone's own text size still applies on top. */
export const LARGE_TEXT_SCALE = 1.25;

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  largeText: boolean;
  setLargeText: (on: boolean) => void;
}>({
  preference: 'system',
  setPreference: () => undefined,
  largeText: false,
  setLargeText: () => undefined,
});

/** Remembers the chosen appearance and text size on this phone; "system" follows the phone. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setState] = useState<ThemePreference>('system');
  const [largeText, setLarge] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (THEME_PREFERENCES.includes(saved as ThemePreference)) {
          setState(saved as ThemePreference);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem(TEXT_KEY)
      .then((saved) => setLarge(saved === 'large'))
      .catch(() => undefined);
  }, []);
  function setPreference(p: ThemePreference) {
    setState(p);
    AsyncStorage.setItem(KEY, p).catch(() => undefined);
  }
  function setLargeText(on: boolean) {
    setLarge(on);
    AsyncStorage.setItem(TEXT_KEY, on ? 'large' : 'normal').catch(() => undefined);
  }
  return (
    <ThemeContext.Provider value={{ preference, setPreference, largeText, setLargeText }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function resolveTheme(
  preference: ThemePreference,
  system: string | null | undefined,
  largeText = false,
): Theme {
  const mode = preference === 'system' ? system : preference;
  const scale = largeText ? LARGE_TEXT_SCALE : 1;
  return { ...(mode === 'dark' ? dark : light), font: (size) => Math.round(size * scale) };
}

export function useThemePreference() {
  return useContext(ThemeContext);
}

export function useTheme(): Theme {
  const { preference, largeText } = useContext(ThemeContext);
  const system = useColorScheme();
  // Kept stable so screens only rebuild their styles when something actually changed.
  return useMemo(
    () => resolveTheme(preference, system, largeText),
    [preference, system, largeText],
  );
}

export const verdictIcon = {
  low: 'shield-checkmark',
  medium: 'warning',
  high: 'close-circle',
  unverified: 'help-circle',
} as const satisfies Record<Shown, string>;
