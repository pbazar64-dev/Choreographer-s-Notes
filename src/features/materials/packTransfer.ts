/**
 * Сборка и добавление набора материалов: файловая часть обмена.
 *
 * Добавление всегда ДОПОЛНЯЕТ базу и ничего не заменяет — в отличие от
 * восстановления из резервной копии. Поэтому набор безопасно принимать
 * от кого угодно: свои материалы никуда не денутся.
 */

import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppDatabase } from '@/db/client';
import {
  addTagToMaterial,
  createMaterial,
  ensureTag,
  getMaterialsByIds,
  listMaterialTags,
  listMaterials,
} from '@/db/repositories/materials.repo';
import type { Material } from '@/db/schema';
import { zipArchive } from '@/lib/archive';
import { toFilePath } from '@/lib/fileUri';
import {
  copyIntoMaterials,
  copyIntoThumbnails,
  deleteEntryQuietly,
  ensureMediaDirectories,
  toAbsoluteUri,
} from '@/lib/files';
import { fallbackExtensionFor } from '@/lib/mediaTypes';

import {
  PACK_FILES_DIR,
  PACK_MANIFEST_NAME,
  buildPack,
  buildPackFileName,
  findDuplicate,
  packEntryFor,
  packFileName,
  parsePack,
  type MaterialsPack,
  type PackEntry,
} from './pack';

export type PackProgress = { current: number; total: number; title: string };

/* ---------------------------------------------------------------- сборка */

export type PackExportResult = {
  uri: string;
  /** Материалы, файлы которых не нашлись на диске: в набор они не попали. */
  skipped: string[];
};

export async function exportMaterialsPack(
  db: AppDatabase,
  materialIds: readonly number[],
  onProgress?: (progress: PackProgress) => void,
): Promise<PackExportResult> {
  const materials = getMaterialsByIds(db, materialIds);
  if (materials.length === 0) {
    throw new Error('Не выбрано ни одного материала.');
  }

  const staging = new Directory(Paths.cache, `pack-staging-${Date.now()}`);
  deleteEntryQuietly(staging);
  staging.create({ intermediates: true, idempotent: true });

  const filesDirectory = new Directory(staging, PACK_FILES_DIR);
  filesDirectory.create({ intermediates: true, idempotent: true });

  try {
    const entries: PackEntry[] = [];
    const skipped: string[] = [];

    for (const [index, material] of materials.entries()) {
      onProgress?.({ current: index + 1, total: materials.length, title: material.title });

      const copiedFiles = await copyMaterialFilesIntoPack(material, filesDirectory);
      if (!copiedFiles) {
        skipped.push(material.title);
        continue;
      }

      const tags = listMaterialTags(db, material.id).map((tag) => tag.name);
      entries.push(packEntryFor(material, tags));

      // Возвращаем управление интерфейсу: копирование гигабайтов не должно
      // подвешивать экран.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (entries.length === 0) {
      throw new Error('Файлы выбранных материалов не найдены на устройстве.');
    }

    const manifest = new File(staging, PACK_MANIFEST_NAME);
    manifest.create({ overwrite: true });
    manifest.write(JSON.stringify(buildPack(entries, new Date()), null, 2));

    const archive = new File(Paths.cache, buildPackFileName(new Date(), entries.length));
    deleteEntryQuietly(archive);
    await zipArchive().zip(toFilePath(staging.uri), toFilePath(archive.uri));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archive.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Отправить набор материалов',
      });
    }

    return { uri: archive.uri, skipped };
  } finally {
    deleteEntryQuietly(staging);
  }
}

/** Кладёт файл материала и превью в набор. null — файла нет на диске. */
async function copyMaterialFilesIntoPack(
  material: Material,
  filesDirectory: Directory,
): Promise<boolean> {
  if (material.localPath) {
    const source = new File(toAbsoluteUri(material.localPath));
    if (!source.exists) return false;

    await source.copy(new File(filesDirectory, packFileName(material.localPath)));
  } else if (!material.url) {
    return false;
  }

  if (material.thumbnailPath && material.thumbnailPath !== material.localPath) {
    const thumbnail = new File(toAbsoluteUri(material.thumbnailPath));
    if (thumbnail.exists) {
      await thumbnail.copy(new File(filesDirectory, packFileName(material.thumbnailPath)));
    }
  }

  return true;
}

/* ------------------------------------------------------------ добавление */

export type OpenedPack = {
  pack: MaterialsPack;
  /** Папка внутри распакованного архива, где лежат pack.json и files/. */
  rootUri: string;
  stagingUri: string;
};

export type PackOpenResult = { ok: true; opened: OpenedPack } | { ok: false; reason: string };

/**
 * Распаковывает и проверяет архив, но ничего не добавляет: сначала человек
 * должен увидеть, что именно ему прислали, и подтвердить.
 */
export async function openPackArchive(pickedUri: string): Promise<PackOpenResult> {
  const staging = new Directory(Paths.cache, `pack-open-${Date.now()}`);
  deleteEntryQuietly(staging);
  staging.create({ intermediates: true, idempotent: true });

  try {
    await zipArchive().unzip(toFilePath(pickedUri), toFilePath(staging.uri));

    const root = findPackRoot(staging);
    if (!root) {
      deleteEntryQuietly(staging);
      return { ok: false, reason: 'В архиве нет описания набора — это не набор материалов.' };
    }

    const parsed = parsePack(new File(root, PACK_MANIFEST_NAME).textSync());
    if (!parsed.ok) {
      deleteEntryQuietly(staging);
      return { ok: false, reason: parsed.reason };
    }

    return { ok: true, opened: { pack: parsed.pack, rootUri: root.uri, stagingUri: staging.uri } };
  } catch (error) {
    deleteEntryQuietly(staging);
    throw error;
  }
}

/** Временную папку нужно убрать и когда набор добавили, и когда передумали. */
export function discardPack(opened: OpenedPack): void {
  deleteEntryQuietly(new Directory(opened.stagingUri));
}

export type PackImportResult = {
  added: number;
  /** Материалы, которые уже есть в базе: повторно не добавляем. */
  skipped: number;
  failed: string[];
};

export async function applyPack(
  db: AppDatabase,
  opened: OpenedPack,
  onProgress?: (progress: PackProgress) => void,
): Promise<PackImportResult> {
  ensureMediaDirectories();

  const root = new Directory(opened.rootUri);
  const entries = opened.pack.materials;
  // Читаем базу один раз: сравнивать каждую запись отдельным запросом незачем.
  const existing = listMaterials(db);

  const result: PackImportResult = { added: 0, skipped: 0, failed: [] };

  for (const [index, entry] of entries.entries()) {
    onProgress?.({ current: index + 1, total: entries.length, title: entry.title });

    try {
      const created = await addPackEntry(db, root, entry, existing);

      if (created) {
        existing.push(created);
        result.added += 1;
      } else {
        result.skipped += 1;
      }
    } catch {
      result.failed.push(entry.title);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return result;
}

/** null — такой материал уже есть, добавлять второй раз не нужно. */
async function addPackEntry(
  db: AppDatabase,
  root: Directory,
  entry: PackEntry,
  existing: readonly Material[],
): Promise<Material | null> {
  if (findDuplicate(entry, existing)) return null;

  let localPath: string | null = null;
  let fileSizeBytes = entry.fileSizeBytes;

  if (entry.file) {
    const source = new File(root, entry.file);
    if (!source.exists) {
      throw new Error(`Файл ${entry.file} не найден в архиве.`);
    }

    const copied = await copyIntoMaterials(
      source.uri,
      packFileName(entry.file),
      fallbackExtensionFor(entry.type),
    );
    localPath = copied.relativePath;
    fileSizeBytes = copied.sizeBytes ?? entry.fileSizeBytes;
  }

  const thumbnailPath = await copyPackThumbnail(root, entry, localPath);

  const material = createMaterial(db, {
    type: entry.type,
    title: entry.title,
    description: entry.description,
    localPath,
    url: entry.url,
    thumbnailPath,
    durationSec: entry.durationSec,
    fileSizeBytes,
  });

  for (const name of entry.tags) {
    const tag = ensureTag(db, name);
    if (tag) addTagToMaterial(db, material.id, tag.id);
  }

  return material;
}

async function copyPackThumbnail(
  root: Directory,
  entry: PackEntry,
  localPath: string | null,
): Promise<string | null> {
  if (!entry.thumbnail) return null;

  // У картинок превью — это сам файл, он уже скопирован.
  if (entry.thumbnail === entry.file) return localPath;

  const source = new File(root, entry.thumbnail);
  if (!source.exists) return null;

  return copyIntoThumbnails(source.uri);
}

/** Архиватор мог положить содержимое как в корень, так и во вложенную папку. */
function findPackRoot(staging: Directory): Directory | null {
  if (new File(staging, PACK_MANIFEST_NAME).exists) return staging;

  for (const entry of staging.list()) {
    if (entry instanceof Directory && new File(entry, PACK_MANIFEST_NAME).exists) {
      return entry;
    }
  }

  return null;
}

export async function pickPackArchive(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
