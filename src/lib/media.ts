import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { createAudioPlayer } from 'expo-audio';
import { createVideoPlayer } from 'expo-video';

import type { MaterialType } from '@/db/schema';

import { copyIntoThumbnails } from './files';

export {
  detectMaterialType,
  fallbackExtensionFor,
  linkSourceLabel,
  titleFromFileName,
} from './mediaTypes';

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

const MEDIA_MIME_TYPES = ['video/*', 'audio/*'];

/**
 * Выбор файлов системным пикером (Storage Access Framework).
 * Разрешения на хранилище для этого пути не нужны — их и не спрашиваем.
 *
 * Берём пикер из expo-file-system: у expo-document-picker есть защита
 * «выбор уже идёт», и если предыдущий вызов не завершился (так бывает, когда
 * пикер закрывают системной кнопкой «назад»), все следующие попытки молча
 * падают до перезапуска приложения. Старый пикер оставлен запасным путём.
 */
export async function pickMediaFiles(multiple = true): Promise<PickedFile[]> {
  try {
    const picked = await File.pickFileAsync({
      multipleFiles: true,
      mimeTypes: MEDIA_MIME_TYPES,
    });

    if (picked.canceled || !picked.result) return [];

    const files = Array.isArray(picked.result) ? picked.result : [picked.result];
    return files.map((file) => ({
      uri: file.uri,
      name: file.name,
      mimeType: null,
      sizeBytes: file.exists ? (file.size ?? null) : null,
    }));
  } catch {
    return pickMediaFilesLegacy(multiple);
  }
}

async function pickMediaFilesLegacy(multiple: boolean): Promise<PickedFile[]> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: MEDIA_MIME_TYPES,
      multiple,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return [];

    return result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? null,
      sizeBytes: asset.size ?? null,
    }));
  } catch {
    // Оба пикера отказали — вернуть пустой выбор честнее, чем уронить экран.
    return [];
  }
}

/** Кадр из видео как превью. Возвращает относительный путь или null. */
export async function generateVideoThumbnail(absoluteUri: string): Promise<string | null> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(absoluteUri, { time: 1000 });
    return await copyIntoThumbnails(uri);
  } catch {
    // Битое или неподдерживаемое видео — не повод срывать импорт.
    return null;
  }
}

const DURATION_TIMEOUT_MS = 4000;

/**
 * Длительность файла в секундах. Плеер грузит метаданные асинхронно,
 * поэтому ждём готовности с таймаутом и в любом случае освобождаем плеер.
 */
export async function probeDurationSec(
  absoluteUri: string,
  type: MaterialType,
): Promise<number | null> {
  if (type === 'image') return null;

  const player =
    type === 'audio_file' || type === 'audio_link'
      ? createAudioPlayer({ uri: absoluteUri })
      : createVideoPlayer({ uri: absoluteUri });

  try {
    const deadline = Date.now() + DURATION_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const duration = player.duration;
      if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        return Math.round(duration);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}
