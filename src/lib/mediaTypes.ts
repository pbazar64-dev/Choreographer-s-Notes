import type { MaterialType } from '@/db/schema';

/**
 * Чистые функции о материалах: без обращений к файловой системе и нативным
 * модулям, поэтому проверяются юнит-тестами.
 */

/** Тип материала по MIME-типу и расширению файла. */
export function detectMaterialType(mimeType: string | null, fileName: string): MaterialType {
  const name = fileName.toLowerCase();

  if (mimeType?.startsWith('video/')) return 'video_file';
  if (mimeType?.startsWith('audio/')) return 'audio_file';
  if (mimeType?.startsWith('image/')) return 'image';

  if (/\.(mp4|mov|mkv|avi|webm|3gp|m4v)$/.test(name)) return 'video_file';
  if (/\.(mp3|wav|m4a|aac|ogg|flac|opus)$/.test(name)) return 'audio_file';
  if (/\.(jpg|jpeg|png|webp|gif|heic)$/.test(name)) return 'image';

  return 'video_file';
}

export function fallbackExtensionFor(type: MaterialType): string {
  switch (type) {
    case 'audio_file':
      return '.mp3';
    case 'image':
      return '.jpg';
    default:
      return '.mp4';
  }
}

/** Бейдж источника для ссылок: youtube.com → «YouTube». */
export function linkSourceLabel(url: string): string {
  const host =
    /^https?:\/\/([^/?#]+)/i
      .exec(url)?.[1]
      ?.toLowerCase()
      .replace(/^www\./, '') ?? '';

  if (host.includes('youtube.') || host.includes('youtu.be')) return 'YouTube';
  if (host.includes('vk.com') || host.includes('vkvideo.')) return 'VK';
  if (host.includes('instagram.')) return 'Instagram';
  if (host.includes('rutube.')) return 'RuTube';
  if (host.includes('dzen.') || host.includes('yandex.')) return 'Яндекс';
  if (!host) return 'Ссылка';

  return host;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return 'размер неизвестен';
  if (bytes < 1024) return `${bytes} Б`;

  const units = ['КБ', 'МБ', 'ГБ'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${String(rounded).replace('.', ',')} ${units[unitIndex]}`;
}

/** Имя материала по имени файла: «разминка_2026.mp4» → «разминка_2026». */
export function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[A-Za-z0-9]{1,8}$/, '');
  return withoutExtension.trim() || 'Без названия';
}
