import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AppDatabase } from '@/db/client';
import * as schema from '@/db/schema';

const MIGRATIONS_DIR = join(__dirname, '../../src/db/migrations');

/**
 * In-memory база для тестов репозиториев: та же схема и те же миграции,
 * что и в приложении, но драйвер better-sqlite3 вместо expo-sqlite.
 */
export function createTestDb(): AppDatabase {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };

  for (const entry of journal.entries) {
    const sql = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  return drizzle(sqlite, { schema }) as unknown as AppDatabase;
}
