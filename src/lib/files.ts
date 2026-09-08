import { Directory, File, Paths } from 'expo-file-system';

export { formatBytes } from './mediaTypes';

/**
 * Материалы копируются в приватную папку приложения, чтобы они не пропали,
 * когда исходник удалят из галереи. В базе хранится путь ОТНОСИТЕЛЬНО
 * documentDirectory: абсолютный путь у Android-приложения меняется между
 * установками, и после восстановления из бэкапа ссылки бы «протухли».
 */
export const MATERIALS_DIR = 'materials';
export const THUMBNAILS_DIR = 'thumbnails';

export function ensureMediaDirectories(): void {
  for (const name of [MATERIALS_DIR, THUMBNAILS_DIR]) {
    const directory = new Directory(Paths.document, name);
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
  }
}

/** 'materials/1736…-a1b2c3.mp4' → 'file:///data/.../materials/1736…-a1b2c3.mp4' */
export function toAbsoluteUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

export function fileExists(relativePath: string): boolean {
  return new File(Paths.document, relativePath).exists;
}

export function getFileSize(relativePath: string): number | null {
  const file = new File(Paths.document, relativePath);
  return file.exists ? (file.size ?? null) : null;
}

function extensionOf(nameOrUri: string, fallback: string): string {
  const clean = nameOrUri.split('?')[0] ?? '';
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(clean);
  return match?.[1] ? `.${match[1].toLowerCase()}` : fallback;
}

function uniqueFileName(sourceName: string, fallbackExtension: string): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${random}${extensionOf(sourceName, fallbackExtension)}`;
}

export type CopiedFile = {
  /** Относительный путь для хранения в базе */
  relativePath: string;
  sizeBytes: number | null;
};

/** Копирует выбранный файл в materials/. Исходник не трогаем. */
export async function copyIntoMaterials(
  sourceUri: string,
  sourceName: string,
  fallbackExtension = '.mp4',
): Promise<CopiedFile> {
  ensureMediaDirectories();

  const source = new File(sourceUri);
  const target = new File(
    Paths.document,
    MATERIALS_DIR,
    uniqueFileName(sourceName || sourceUri, fallbackExtension),
  );

  await source.copy(target);

  return {
    relativePath: `${MATERIALS_DIR}/${target.name}`,
    sizeBytes: target.exists ? (target.size ?? null) : null,
  };
}

/** Перекладывает временное превью из кэша в thumbnails/. */
export async function copyIntoThumbnails(sourceUri: string): Promise<string> {
  ensureMediaDirectories();

  const source = new File(sourceUri);
  const target = new File(Paths.document, THUMBNAILS_DIR, uniqueFileName(sourceUri, '.jpg'));

  await source.copy(target);

  return `${THUMBNAILS_DIR}/${target.name}`;
}

/** Тихое удаление: файла может уже не быть, и это не повод падать. */
export function deleteFileQuietly(relativePath: string | null | undefined): void {
  if (!relativePath) return;

  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) file.delete();
  } catch {
    // Файл мог быть удалён снаружи — данные в базе важнее.
  }
}
