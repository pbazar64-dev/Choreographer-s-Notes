import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, closeDatabase, getConnection, getDb, reopenDatabase } from '@/db/client';
import { setSetting, SETTINGS_KEYS } from '@/db/repositories/settings.repo';
import { PACK_MANIFEST_NAME } from '@/features/materials/pack';
import { zipArchive } from '@/lib/archive';
import { toFilePath, toFileUri, joinUri } from '@/lib/fileUri';
import {
  MATERIALS_DIR,
  THUMBNAILS_DIR,
  deleteEntryQuietly,
  ensureMediaDirectories,
} from '@/lib/files';

import {
  BACKUP_FORMAT_VERSION,
  buildBackupFileName,
  parseManifest,
  type BackupManifest,
} from './manifest';

export type BackupStep =
  'prepare' | 'database' | 'materials' | 'archive' | 'share' | 'unpack' | 'restore' | 'done';

export const BACKUP_STEP_LABELS: Record<BackupStep, string> = {
  prepare: 'Готовлю копию',
  database: 'Копирую базу',
  materials: 'Копирую материалы',
  archive: 'Упаковываю архив',
  share: 'Открываю системный диалог',
  unpack: 'Распаковываю архив',
  restore: 'Восстанавливаю данные',
  done: 'Готово',
};

/** Нативные значения читаем через try: геттер может бросить, а не вернуть null. */
function readNativePath(read: () => unknown): string | null {
  try {
    const value = read();
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Где лежит файл базы. Самый надёжный источник — само открытое подключение:
 * expo-sqlite хранит там путь, по которому базу и открыли. Но отдаёт он его
 * без схемы `file://`, поэтому путь обязательно нормализуем — иначе
 * expo-file-system падает с «URI is not absolute».
 */
function databaseFile(): File {
  const fromConnection = toFileUri(readNativePath(() => getConnection().databasePath));
  const fromDefaultDirectory = toFileUri(readNativePath(() => SQLite.defaultDatabaseDirectory));

  const candidates = [
    fromConnection,
    fromDefaultDirectory ? joinUri(fromDefaultDirectory, DATABASE_NAME) : null,
  ];

  for (const uri of candidates) {
    if (!uri) continue;

    try {
      const file = new File(uri);
      if (file.exists) return file;
    } catch {
      // Кандидат не разобрался — пробуем следующий.
    }
  }

  // Запасной вариант: папка по умолчанию внутри данных приложения.
  return new File(Paths.document, 'SQLite', DATABASE_NAME);
}

/**
 * Экспорт: база и все файлы материалов в один .zip, дальше — системный диалог
 * «Поделиться», через который архив кладут в «Загрузки», на карту или в облако.
 */
export async function exportBackup(onStep?: (step: BackupStep) => void): Promise<string> {
  onStep?.('prepare');
  ensureMediaDirectories();

  const staging = new Directory(Paths.cache, `backup-staging-${Date.now()}`);
  deleteEntryQuietly(staging);
  staging.create({ intermediates: true, idempotent: true });

  try {
    onStep?.('database');
    // Сбрасываем журнал WAL, иначе в копию уедет база без последних изменений.
    getConnection().execSync('PRAGMA wal_checkpoint(TRUNCATE);');

    const source = databaseFile();
    if (!source.exists) {
      throw new Error('Не удалось найти файл базы данных.');
    }
    await source.copy(new File(staging, DATABASE_NAME));

    onStep?.('materials');
    for (const name of [MATERIALS_DIR, THUMBNAILS_DIR]) {
      const source = new Directory(Paths.document, name);
      if (source.exists) {
        await source.copy(new Directory(staging, name));
      }
    }

    const manifest: BackupManifest = {
      app: 'choreonotes',
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      databaseName: DATABASE_NAME,
    };
    const manifestFile = new File(staging, 'manifest.json');
    manifestFile.create({ overwrite: true });
    manifestFile.write(JSON.stringify(manifest, null, 2));

    onStep?.('archive');
    const archive = new File(Paths.cache, buildBackupFileName(new Date()));
    deleteEntryQuietly(archive);
    await zipArchive().zip(toFilePath(staging.uri), toFilePath(archive.uri));

    onStep?.('share');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archive.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Сохранить резервную копию',
      });
    }

    setSetting(getDb(), SETTINGS_KEYS.lastBackupAt, String(Date.now()));
    onStep?.('done');

    return archive.uri;
  } finally {
    deleteEntryQuietly(staging);
  }
}

export type RestoreResult = { restored: boolean; reason?: string };

/**
 * Импорт: архив распаковывается во временную папку, проверяется, и только потом
 * подменяет данные. База закрывается на время подмены файла и открывается заново.
 */
export async function importBackup(
  pickedUri: string,
  onStep?: (step: BackupStep) => void,
): Promise<RestoreResult> {
  onStep?.('unpack');

  const staging = new Directory(Paths.cache, `restore-staging-${Date.now()}`);
  deleteEntryQuietly(staging);
  staging.create({ intermediates: true, idempotent: true });

  try {
    await zipArchive().unzip(toFilePath(pickedUri), toFilePath(staging.uri));

    const root = findBackupRoot(staging);
    if (!root) {
      // Набор материалов и копию легко перепутать: оба — zip от этого приложения.
      return {
        restored: false,
        reason: containsPack(staging)
          ? 'Это набор материалов, а не резервная копия. Его нужно добавлять кнопкой «Добавить набор от друга».'
          : 'В архиве нет manifest.json — это не копия приложения.',
      };
    }

    const manifestFile = new File(root, 'manifest.json');
    const manifest = parseManifest(manifestFile.textSync());
    if (!manifest.ok) {
      return { restored: false, reason: manifest.reason };
    }

    const backupDatabase = new File(root, manifest.manifest.databaseName);
    if (!backupDatabase.exists) {
      return { restored: false, reason: 'В архиве нет файла базы данных.' };
    }

    onStep?.('restore');
    // Путь к базе спрашиваем до закрытия: он берётся у живого подключения.
    const target = databaseFile();

    closeDatabase();
    deleteEntryQuietly(target);
    // Журналы старой базы удаляем: иначе SQLite попытается применить их к новой.
    deleteEntryQuietly(new File(target.parentDirectory, `${DATABASE_NAME}-wal`));
    deleteEntryQuietly(new File(target.parentDirectory, `${DATABASE_NAME}-shm`));
    await backupDatabase.copy(target);

    for (const name of [MATERIALS_DIR, THUMBNAILS_DIR]) {
      const current = new Directory(Paths.document, name);
      deleteEntryQuietly(current);

      const fromBackup = new Directory(root, name);
      if (fromBackup.exists) {
        await fromBackup.copy(new Directory(Paths.document, name));
      }
    }

    ensureMediaDirectories();
    reopenDatabase();
    onStep?.('done');

    return { restored: true };
  } finally {
    deleteEntryQuietly(staging);
  }
}

function containsPack(staging: Directory): boolean {
  if (new File(staging, PACK_MANIFEST_NAME).exists) return true;

  return staging
    .list()
    .some((entry) => entry instanceof Directory && new File(entry, PACK_MANIFEST_NAME).exists);
}

/** Архиватор мог положить содержимое как в корень, так и во вложенную папку. */
function findBackupRoot(staging: Directory): Directory | null {
  if (new File(staging, 'manifest.json').exists) return staging;

  for (const entry of staging.list()) {
    if (entry instanceof Directory && new File(entry, 'manifest.json').exists) {
      return entry;
    }
  }

  return null;
}

export async function pickBackupArchive(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
