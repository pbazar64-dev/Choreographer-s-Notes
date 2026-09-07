/**
 * Токены оформления. Спокойная «студийная» палитра: тёплый небелый фон,
 * графитовый текст, один акцент. Цветом маркируются только группы.
 */

export const palette = {
  light: {
    background: '#F5F3EF',
    surface: '#FFFFFF',
    surfaceMuted: '#EDEAE4',
    border: '#DCD7CF',
    text: '#1C1A17',
    textMuted: '#6B6560',
    textInverse: '#FAF9F7',
    accent: '#2F5D50',
    accentMuted: '#DCE7E2',
    danger: '#B3402F',
    dangerMuted: '#F6E2DE',
    warning: '#A8792A',
    overlay: 'rgba(20, 17, 15, 0.45)',
  },
  dark: {
    background: '#14110F',
    surface: '#1F1B18',
    surfaceMuted: '#2A2521',
    border: '#3A342E',
    text: '#F2EFEA',
    textMuted: '#A39B92',
    textInverse: '#14110F',
    accent: '#7FB3A1',
    accentMuted: '#25352F',
    danger: '#E08476',
    dangerMuted: '#3A2320',
    warning: '#D9A85A',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColors = Record<keyof (typeof palette)['light'], string>;

/** Шаг сетки — 4dp. Все отступы кратны ему. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** Минимальный размер тапабельной области: в зале попадают на ходу. */
export const HIT_SIZE = 48;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '600' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  subtitle: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Ширина, с которой планшет считается «широким» и включается двухпанельный режим. */
export const WIDE_LAYOUT_BREAKPOINT = 840;
