import type { MaterialType } from '@/db/schema';

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  video_file: 'Видео',
  video_link: 'Видео-ссылка',
  audio_file: 'Аудио',
  audio_link: 'Аудио-ссылка',
  image: 'Фото',
};

/** Фильтры по типу в базе материалов (п. 4.5 ТЗ): видео / аудио / ссылка / фото. */
export const MATERIAL_FILTERS = [
  { code: 'video', label: 'Видео', types: ['video_file', 'video_link'] },
  { code: 'audio', label: 'Аудио', types: ['audio_file', 'audio_link'] },
  { code: 'link', label: 'Ссылки', types: ['video_link', 'audio_link'] },
  { code: 'image', label: 'Фото', types: ['image'] },
] as const satisfies readonly { code: string; label: string; types: readonly MaterialType[] }[];

export type MaterialFilterCode = (typeof MATERIAL_FILTERS)[number]['code'];

export function typesForFilters(codes: readonly MaterialFilterCode[]): MaterialType[] {
  const types = new Set<MaterialType>();

  for (const code of codes) {
    const filter = MATERIAL_FILTERS.find((item) => item.code === code);
    filter?.types.forEach((type) => types.add(type));
  }

  return [...types];
}

export function isLinkMaterial(type: MaterialType): boolean {
  return type === 'video_link' || type === 'audio_link';
}

export function isVideoMaterial(type: MaterialType): boolean {
  return type === 'video_file' || type === 'video_link';
}

export function isAudioMaterial(type: MaterialType): boolean {
  return type === 'audio_file' || type === 'audio_link';
}
