import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useUiPrefs } from '@/stores/uiPrefs';

import { palette, radii, spacing, typography, type ThemeColors } from './tokens';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  /** Множитель размера шрифта конспекта */
  fontScale: number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useUiPrefs((state) => state.themePreference);
  const fontScale = useUiPrefs((state) => state.lessonFontScale);

  const scheme =
    themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;

  const value: Theme = {
    scheme,
    colors: palette[scheme],
    spacing,
    radii,
    typography,
    fontScale,
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  const theme = use(ThemeContext);
  if (!theme) {
    throw new Error('useTheme вызван вне ThemeProvider');
  }
  return theme;
}
