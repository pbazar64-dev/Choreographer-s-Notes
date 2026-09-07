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

export const sqliteConnection = SQLite.openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

// Без этого SQLite молча игнорирует ON DELETE CASCADE.
sqliteConnection.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqliteConnection, { schema }) as unknown as AppDatabase;
