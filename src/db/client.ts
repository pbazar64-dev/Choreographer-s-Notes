import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'choreonotes.db';

/**
 * Тип базы, с которым работают репозитории. Намеренно не привязан к expo-sqlite:
 * в приложении сюда приходит expo-драйвер, в Jest-тестах — better-sqlite3.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

function openConnection(): SQLite.SQLiteDatabase {
  const connection = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  // Без этого SQLite молча игнорирует ON DELETE CASCADE.
  connection.execSync('PRAGMA foreign_keys = ON;');
  return connection;
}

/**
 * Подключение пересоздаётся при восстановлении из резервной копии: файл базы
 * подменяется целиком, поэтому старое подключение нужно закрыть, а не переиспользовать.
 */
let connection = openConnection();
let database = drizzle(connection, { schema }) as unknown as AppDatabase;

export function getDb(): AppDatabase {
  return database;
}

export function getConnection(): SQLite.SQLiteDatabase {
  return connection;
}

export function closeDatabase(): void {
  try {
    connection.closeSync();
  } catch {
    // Уже закрыта — не повод падать при восстановлении.
  }
}

export function reopenDatabase(): AppDatabase {
  connection = openConnection();
  database = drizzle(connection, { schema }) as unknown as AppDatabase;
  return database;
}
