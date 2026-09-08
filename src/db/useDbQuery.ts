import { useMemo } from 'react';

import { useDbRevision } from '@/stores/dbRevision';

import type { AppDatabase } from './client';
import { useDatabase } from './useDatabase';

/**
 * Чтение из базы в компоненте. Запрос выполняется синхронно (expo-sqlite),
 * пересчитывается при смене зависимостей и после любой записи (bumpDbRevision).
 *
 * Зависимости должны быть простыми значениями (числа, строки, булевы):
 * они сравниваются сериализацией.
 */
export function useDbQuery<T>(runner: (db: AppDatabase) => T, deps: readonly unknown[] = []): T {
  const db = useDatabase();
  const revision = useDbRevision((state) => state.revision);
  const depsKey = JSON.stringify(deps);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => runner(db), [db, revision, depsKey]);
}
