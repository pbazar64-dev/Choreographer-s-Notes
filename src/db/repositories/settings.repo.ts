import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import { appSettings } from '../schema';

export const SETTINGS_KEYS = {
  themePreference: 'theme_preference',
  lessonFontScale: 'lesson_font_scale',
  lastBackupAt: 'last_backup_at',
  lessonsSortNewestFirst: 'lessons_sort_newest_first',
  seedVersion: 'seed_version',
  tagsNormalizedVersion: 'tags_normalized_version',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export function getSetting(db: AppDatabase, key: SettingsKey): string | null {
  return db.select().from(appSettings).where(eq(appSettings.key, key)).get()?.value ?? null;
}

export function setSetting(db: AppDatabase, key: SettingsKey, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getNumberSetting(db: AppDatabase, key: SettingsKey): number | null {
  const raw = getSetting(db, key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getAllSettings(db: AppDatabase): Record<string, string> {
  return Object.fromEntries(
    db
      .select()
      .from(appSettings)
      .all()
      .map((row) => [row.key, row.value]),
  );
}
