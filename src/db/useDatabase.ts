import { useMemo } from 'react';

import { db, type AppDatabase } from './client';

/** Единая точка получения базы в компонентах: прямых SQL-запросов в UI нет. */
export function useDatabase(): AppDatabase {
  return useMemo(() => db, []);
}
