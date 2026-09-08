import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Масштаб шрифта конспекта: в зале смотрят с полутора метров. */
export const FONT_SCALES = [1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALES)[number];

type UiPrefsState = {
  themePreference: ThemePreference;
  lessonFontScale: FontScale;
  /** Порядок конспектов в ленте группы: новые сверху или старые сверху */
  lessonsNewestFirst: boolean;
  hydrated: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setLessonFontScale: (value: FontScale) => void;
  setLessonsNewestFirst: (value: boolean) => void;
  hydrate: (values: { themePreference: ThemePreference; lessonFontScale: FontScale }) => void;
};

/**
 * Состояние интерфейса. Сохранение в app_settings подключается на Э8,
 * здесь — только источник правды для текущего сеанса.
 */
export const useUiPrefs = create<UiPrefsState>((set) => ({
  themePreference: 'system',
  lessonFontScale: 1,
  lessonsNewestFirst: true,
  hydrated: false,
  setThemePreference: (themePreference) => set({ themePreference }),
  setLessonFontScale: (lessonFontScale) => set({ lessonFontScale }),
  setLessonsNewestFirst: (lessonsNewestFirst) => set({ lessonsNewestFirst }),
  hydrate: (values) => set({ ...values, hydrated: true }),
}));
