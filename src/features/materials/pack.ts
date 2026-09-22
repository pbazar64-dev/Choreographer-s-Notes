/**
 * Набор материалов — это способ передать часть базы другому человеку так,
 * чтобы у него материалы появились уже подписанными и с тегами, а не просто
 * россыпью видеофайлов.
 *
 * Формат: обычный .zip, внутри `pack.json` с описанием и папка `files/`
 * с самими файлами. Идентификаторы в набор не кладутся — на чужом устройстве
 * они ничего не значат, материалы создаются заново.
 *
 * Здесь только чистая часть: описание формата, разбор и проверки. Копирование
 * файлов и архивация — в packTransfer.ts.
 */

import type { Material, MaterialType } from '@/db/schema';
import { normalizeSearch } from '@/lib/search';

export const PACK_FORMAT_VERSION = 1;
export const PACK_MANIFEST_NAME = 'pack.json';
export const PACK_FILES_DIR = 'files';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'video_file',
  'video_link',
  'audio_file',
  'audio_link',
  'image',
];

/**
 * Имена файлов внутри набора проверяем строго. Архив приходит от другого
 * человека, и запись вида `../../base.db` не должна увести копирование
 * за пределы распакованной папки.
 */
const SAFE_PACK_PATH = new RegExp(`^${PACK_FILES_DIR}/[A-Za-z0-9._-]+$`);

export type PackEntry = {
  type: MaterialType;
  title: string;
  description: string;
  url: string | null;
  /** Путь внутри архива: 'files/abc.mp4'. У материалов-ссылок файла нет. */
  file: string | null;
  thumbnail: string | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  tags: string[];
};

export type MaterialsPack = {
  app: 'choreonotes';
  kind: 'materials-pack';
  formatVersion: number;
  createdAt: string;
  materials: PackEntry[];
};

export function buildPackFileName(date: Date, count: number): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return `choreonotes-materials-${count}-${stamp}.zip`;
}

/** Имя файла внутри архива: берём последний сегмент относительного пути. */
export function packFileName(relativePath: string): string {
  return relativePath.slice(relativePath.lastIndexOf('/') + 1);
}

export function packEntryFor(material: Material, tags: readonly string[]): PackEntry {
  const file = material.localPath ? `${PACK_FILES_DIR}/${packFileName(material.localPath)}` : null;

  return {
    type: material.type,
    title: material.title,
    description: material.description,
    url: material.url,
    file,
    // У картинок превью — это сам файл: второй раз его в архив не кладём.
    thumbnail: material.thumbnailPath
      ? material.thumbnailPath === material.localPath
        ? file
        : `${PACK_FILES_DIR}/${packFileName(material.thumbnailPath)}`
      : null,
    durationSec: material.durationSec,
    fileSizeBytes: material.fileSizeBytes,
    tags: [...tags],
  };
}

export function buildPack(entries: readonly PackEntry[], createdAt: Date): MaterialsPack {
  return {
    app: 'choreonotes',
    kind: 'materials-pack',
    formatVersion: PACK_FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    materials: [...entries],
  };
}

export type PackCheck = { ok: true; pack: MaterialsPack } | { ok: false; reason: string };

export function parsePack(raw: string): PackCheck {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Описание набора повреждено.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'Описание набора повреждено.' };
  }

  const candidate = parsed as Record<string, unknown>;

  if (candidate.app !== 'choreonotes') {
    return { ok: false, reason: 'Этот архив создан другим приложением.' };
  }

  // Резервную копию легко перепутать с набором: подскажем, куда её нести.
  if (typeof candidate.databaseName === 'string' && candidate.kind !== 'materials-pack') {
    return {
      ok: false,
      reason: 'Это резервная копия, а не набор материалов. Её нужно открывать через «Восстановить из копии».',
    };
  }

  if (candidate.kind !== 'materials-pack') {
    return { ok: false, reason: 'Этот архив — не набор материалов.' };
  }

  if (typeof candidate.formatVersion !== 'number') {
    return { ok: false, reason: 'В наборе не указана версия формата.' };
  }

  if (candidate.formatVersion > PACK_FORMAT_VERSION) {
    return {
      ok: false,
      reason: 'Набор собран более новой версией приложения. Обновите приложение и повторите.',
    };
  }

  if (!Array.isArray(candidate.materials)) {
    return { ok: false, reason: 'В наборе нет списка материалов.' };
  }

  const materials = candidate.materials
    .map((item) => sanitizeEntry(item))
    .filter((entry): entry is PackEntry => entry !== null);

  if (materials.length === 0) {
    return { ok: false, reason: 'В наборе не оказалось ни одного материала.' };
  }

  return {
    ok: true,
    pack: {
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: candidate.formatVersion,
      createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
      materials,
    },
  };
}

/** Записи с непонятным типом или небезопасным путём молча пропускаем. */
function sanitizeEntry(raw: unknown): PackEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const item = raw as Record<string, unknown>;
  const type = MATERIAL_TYPES.find((value) => value === item.type);
  if (!type) return null;

  const file = safePackPath(item.file);
  const url = typeof item.url === 'string' && item.url.trim() ? item.url.trim() : null;

  // Материал без файла и без ссылки открыть будет нечем.
  if (!file && !url) return null;

  const title = typeof item.title === 'string' ? item.title.trim() : '';

  return {
    type,
    title: title || 'Без названия',
    description: typeof item.description === 'string' ? item.description : '',
    url,
    file,
    thumbnail: safePackPath(item.thumbnail),
    durationSec: positiveNumber(item.durationSec),
    fileSizeBytes: positiveNumber(item.fileSizeBytes),
    tags: Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  };
}

function safePackPath(raw: unknown): string | null {
  return typeof raw === 'string' && SAFE_PACK_PATH.test(raw) ? raw : null;
}

function positiveNumber(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
}

/**
 * Тот же материал, уже добавленный раньше. Полноценно сравнивать содержимое
 * файлов слишком дорого (гигабайты видео), поэтому сравниваем то, что
 * достаточно надёжно и мгновенно: ссылку либо название вместе с размером.
 */
export function findDuplicate(entry: PackEntry, existing: readonly Material[]): Material | null {
  if (entry.url) {
    const url = entry.url.trim().toLowerCase();
    return existing.find((item) => item.url?.trim().toLowerCase() === url) ?? null;
  }

  if (!entry.fileSizeBytes) return null;

  const title = normalizeSearch(entry.title);

  return (
    existing.find(
      (item) =>
        item.fileSizeBytes === entry.fileSizeBytes && normalizeSearch(item.title) === title,
    ) ?? null
  );
}

/** Сколько всего весит набор — показывается до сборки и до добавления. */
export function packSize(entries: readonly { fileSizeBytes: number | null }[]): number {
  return entries.reduce((total, entry) => total + (entry.fileSizeBytes ?? 0), 0);
}

/**
 * Порог, после которого архив уже не пройдёт через мессенджер: предупреждаем
 * заранее, чтобы человек не ждал упаковки впустую.
 */
export const PACK_MESSENGER_LIMIT_BYTES = 100 * 1024 * 1024;
