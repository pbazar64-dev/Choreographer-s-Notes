import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadPreferences } from '@/features/settings/preferences';

import { getDb, getDrizzle } from './client';
import { normalizeExistingTags } from './repositories/materials.repo';
import { getSetting, setSetting, SETTINGS_KEYS } from './repositories/settings.repo';
import migrations from './migrations/migrations';
import { seedIfEmpty } from './seed';

/** Включать ли сид тестовыми данными. На боевую сборку — false. */
const ENABLE_SEED = __DEV__;

export function DatabaseProvider({ children }: { children: ReactNode }) {
  // Мигратору нужен именно инстанс drizzle, а не подключение expo-sqlite.
  const { success, error } = useMigrations(getDrizzle(), migrations);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState<unknown>(null);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    // Сид выносим из тела эффекта, чтобы не дёргать setState синхронно при монтировании.
    void Promise.resolve()
      .then(() => {
        if (ENABLE_SEED) {
          seedIfEmpty(getDb());
        }
        normalizeSavedTags();
        loadPreferences(getDb());
        if (!cancelled) setReady(true);
      })
      .catch((cause) => {
        if (!cancelled) setStartupError(cause);
      });

    return () => {
      cancelled = true;
    };
  }, [success]);

  const failure = error ?? startupError;
  if (failure) {
    return <StartupFailure error={failure} />;
  }

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

const TAGS_NORMALIZED_VERSION = '1';

/** Разовое приведение сохранённых тегов к единому виду: «ПРЫЖКИ» → «Прыжки». */
function normalizeSavedTags(): void {
  const db = getDb();
  if (getSetting(db, SETTINGS_KEYS.tagsNormalizedVersion) === TAGS_NORMALIZED_VERSION) return;

  normalizeExistingTags(db);
  setSetting(db, SETTINGS_KEYS.tagsNormalizedVersion, TAGS_NORMALIZED_VERSION);
}

/** Экран вместо молчаливого падения: без него на планшете не видно причины. */
function StartupFailure({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error);

  return (
    <ScrollView contentContainerStyle={styles.failure}>
      <Text style={styles.failureTitle}>Не удалось подготовить базу данных</Text>
      <Text selectable style={styles.failureText}>
        {message}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  failure: { backgroundColor: '#F5F3EF', flexGrow: 1, gap: 12, padding: 24 },
  failureTitle: { color: '#1C1A17', fontSize: 20, fontWeight: '600' },
  failureText: { color: '#6B6560', fontSize: 13, lineHeight: 19 },
});
