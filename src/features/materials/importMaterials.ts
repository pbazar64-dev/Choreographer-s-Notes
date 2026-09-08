import type { AppDatabase } from '@/db/client';
import { createMaterial, deleteMaterial } from '@/db/repositories/materials.repo';
import type { Material, MaterialType } from '@/db/schema';
import {
  copyIntoMaterials,
  deleteFileQuietly,
  ensureMediaDirectories,
  toAbsoluteUri,
} from '@/lib/files';
import { generateVideoThumbnail, probeDurationSec, type PickedFile } from '@/lib/media';
import { detectMaterialType, fallbackExtensionFor, titleFromFileName } from '@/lib/mediaTypes';

export type ImportProgress = {
  current: number;
  total: number;
  title: string;
};

/**
 * Импорт одного файла: копия в materials/, превью, длительность, запись в базу.
 * Файл копируется ДО записи в базу — иначе в базе появится ссылка в никуда.
 */
export async function importFile(db: AppDatabase, file: PickedFile): Promise<Material> {
  ensureMediaDirectories();

  const type = detectMaterialType(file.mimeType, file.name);
  const copied = await copyIntoMaterials(file.uri, file.name, fallbackExtensionFor(type));
  const absoluteUri = toAbsoluteUri(copied.relativePath);

  const thumbnailPath =
    type === 'video_file'
      ? await generateVideoThumbnail(absoluteUri)
      : type === 'image'
        ? copied.relativePath
        : null;

  const durationSec = await probeDurationSec(absoluteUri, type);

  return createMaterial(db, {
    type,
    title: titleFromFileName(file.name),
    localPath: copied.relativePath,
    thumbnailPath,
    durationSec,
    fileSizeBytes: copied.sizeBytes ?? file.sizeBytes ?? null,
  });
}

/**
 * Массовый импорт. Файлы обрабатываются по одному, между ними управление
 * возвращается интерфейсу: копирование гигабайтов не должно подвешивать экран.
 */
export async function importFiles(
  db: AppDatabase,
  files: readonly PickedFile[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<{ imported: Material[]; failed: string[] }> {
  const imported: Material[] = [];
  const failed: string[] = [];

  for (const [index, file] of files.entries()) {
    onProgress?.({ current: index + 1, total: files.length, title: file.name });

    try {
      imported.push(await importFile(db, file));
    } catch {
      failed.push(file.name);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { imported, failed };
}

export function createLinkMaterial(
  db: AppDatabase,
  params: { url: string; title: string; type: Extract<MaterialType, 'video_link' | 'audio_link'> },
): Material {
  return createMaterial(db, {
    type: params.type,
    title: params.title.trim(),
    url: params.url.trim(),
  });
}

/** Удаляет материал вместе с файлом и превью — только после подтверждения в UI. */
export function deleteMaterialWithFiles(db: AppDatabase, material: Material): void {
  deleteMaterial(db, material.id);
  deleteFileQuietly(material.localPath);

  if (material.thumbnailPath && material.thumbnailPath !== material.localPath) {
    deleteFileQuietly(material.thumbnailPath);
  }
}
