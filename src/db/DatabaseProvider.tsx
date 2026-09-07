import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import migrations from './migrations/migrations';
import { db, sqliteConnection } from './client';
import { seedIfEmpty } from './seed';

/** Включать ли сид тестовыми данными. На боевую сборку — false. */
const ENABLE_SEED = __DEV__;

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(sqliteConnection as never, migrations);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    // Сид выносим из тела эффекта, чтобы не дёргать setState синхронно при монтировании.
    void Promise.resolve().then(() => {
      if (ENABLE_SEED) {
        seedIfEmpty(db);
      }
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [success]);

  if (error) {
    throw error;
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

const styles = StyleSheet.create({
  loader: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
