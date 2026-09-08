import type { AppDatabase } from '@/db/client';
import {
  getNumberSetting,
  getSetting,
  setSetting,
  SETTINGS_KEYS,
} from '@/db/repositories/settings.repo';
import { FONT_SCALES, useUiPrefs, type FontScale, type ThemePreference } from '@/stores/uiPrefs';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function toFontScale(value: number | null): FontScale {
  return FONT_SCALES.find((scale) => scale === value) ?? 1;
}

/** Читает сохранённые настройки при запуске приложения. */
export function loadPreferences(db: AppDatabase): void {
  const theme = getSetting(db, SETTINGS_KEYS.themePreference);
  const fontScale = getNumberSetting(db, SETTINGS_KEYS.lessonFontScale);
  const sortValue = getSetting(db, SETTINGS_KEYS.lessonsSortNewestFirst);

  useUiPrefs.getState().hydrate({
    themePreference: isThemePreference(theme) ? theme : 'system',
    lessonFontScale: toFontScale(fontScale),
    lessonsNewestFirst: sortValue === null ? true : sortValue === '1',
  });
}

export function saveThemePreference(db: AppDatabase, value: ThemePreference): void {
  useUiPrefs.getState().setThemePreference(value);
  setSetting(db, SETTINGS_KEYS.themePreference, value);
}

export function saveFontScale(db: AppDatabase, value: FontScale): void {
  useUiPrefs.getState().setLessonFontScale(value);
  setSetting(db, SETTINGS_KEYS.lessonFontScale, String(value));
}

export function saveLessonsSort(db: AppDatabase, newestFirst: boolean): void {
  useUiPrefs.getState().setLessonsNewestFirst(newestFirst);
  setSetting(db, SETTINGS_KEYS.lessonsSortNewestFirst, newestFirst ? '1' : '0');
}
