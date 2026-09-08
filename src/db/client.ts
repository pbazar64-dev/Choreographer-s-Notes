import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'choreonotes.db';

/**
 * Тип базы, с которым работают репозитории. Намеренно не привязан к expo-sqlite:
 * в приложении сюда приходит expo-драйвер, в Jest-тестах — better-sqlite3.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

type Handles = {
  connection: SQLite.SQLiteDatabase;
  database: ExpoSQLiteDatabase<typeof schema>;
};

/**
 * База открывается лениво, при первом обращении, а не при импорте модуля:
 * ошибка на старте приложения должна долетать до React и показываться на экране,
 * а не убивать процесс до первого рендера.
 *
 * Подключение пересоздаётся при восстановлении из резервной копии: файл базы
 * подменяется целиком, поэтому старое подключение нужно закрыть, а не переиспользовать.
 */
let handles: Handles | null = null;

function openHandles(): Handles {
  const connection = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  // Без этого SQLite молча игнорирует ON DELETE CASCADE.
  connection.execSync('PRAGMA foreign_keys = ON;');

  return { connection, database: drizzle(connection, { schema }) };
}

function ensureHandles(): Handles {
  if (!handles) {
    handles = openHandles();
  }
  return handles;
}

export function getConnection(): SQLite.SQLiteDatabase {
  return ensureHandles().connection;
}

/** Инстанс drizzle в «родном» типе — его ждёт мигратор expo-sqlite. */
export function getDrizzle(): ExpoSQLiteDatabase<typeof schema> {
  return ensureHandles().database;
}

export function getDb(): AppDatabase {
  return ensureHandles().database as unknown as AppDatabase;
}

export function closeDatabase(): void {
  try {
    handles?.connection.closeSync();
  } catch {
    // Уже закрыта — не повод падать при восстановлении.
  } finally {
    handles = null;
  }
}

export function reopenDatabase(): AppDatabase {
  closeDatabase();
  return getDb();
}
