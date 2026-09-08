import { getDb, type AppDatabase } from './client';
import { useDbRevision } from '@/stores/dbRevision';

/**
 * Единая точка получения базы в компонентах: прямых SQL-запросов в UI нет.
 * Подписка на счётчик изменений нужна, чтобы после восстановления из копии
 * экраны получили новое подключение, а не закрытое старое.
 */
export function useDatabase(): AppDatabase {
  useDbRevision((state) => state.revision);
  return getDb();
}
