import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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

/**
 * Выбор файлов системным пикером (Storage Access Framework).
 * Разрешения на хранилище для этого пути не нужны — их и не спрашиваем.
 */
export async function pickMediaFiles(multiple = true): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['video/*', 'audio/*', 'image/*'],
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
}

/** Съёмка видео на камеру. Разрешение CAMERA спрашивается здесь и только здесь. */
export async function recordVideo(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: 300,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `video-${Date.now()}.mp4`,
    mimeType: asset.mimeType ?? 'video/mp4',
    sizeBytes: asset.fileSize ?? null,
  };
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
