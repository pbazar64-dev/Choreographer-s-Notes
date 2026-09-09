import {
  addTagToMaterial,
  createMaterial,
  ensureTag,
  getMaterialUsage,
  listMaterialTags,
  listMaterials,
  removeTagFromMaterial,
} from '@/db/repositories/materials.repo';
import { createGroup } from '@/db/repositories/groups.repo';
import { createLesson } from '@/db/repositories/lessons.repo';
import { createBlock } from '@/db/repositories/blocks.repo';
import { attachMaterialToBlock } from '@/db/repositories/materials.repo';
import type { AppDatabase } from '@/db/client';
import { countTagUsage, deleteTag, parseTagNames } from '@/db/repositories/materials.repo';
import {
  detectMaterialType,
  formatBytes,
  linkSourceLabel,
  titleFromFileName,
} from '@/lib/mediaTypes';

import { createTestDb } from './helpers/testDb';

describe('определение типа материала', () => {
  it('верит MIME-типу, когда он есть', () => {
    expect(detectMaterialType('video/mp4', 'clip.bin')).toBe('video_file');
    expect(detectMaterialType('audio/mpeg', 'track.bin')).toBe('audio_file');
    expect(detectMaterialType('image/jpeg', 'photo.bin')).toBe('image');
  });

  it('определяет тип по расширению, когда MIME-типа нет', () => {
    expect(detectMaterialType(null, 'razminka.MOV')).toBe('video_file');
    expect(detectMaterialType(null, 'slow-track.m4a')).toBe('audio_file');
    expect(detectMaterialType(null, 'shema.png')).toBe('image');
  });
});

describe('подписи для материалов', () => {
  it('узнаёт источник ссылки', () => {
    expect(linkSourceLabel('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(linkSourceLabel('https://youtu.be/abc')).toBe('YouTube');
    expect(linkSourceLabel('https://vk.com/video-1_2')).toBe('VK');
    expect(linkSourceLabel('https://example.com/a.mp4')).toBe('example.com');
  });

  it('форматирует размер файла по-русски', () => {
    expect(formatBytes(512)).toBe('512 Б');
    expect(formatBytes(1536)).toBe('1,5 КБ');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 МБ');
    expect(formatBytes(null)).toBe('размер неизвестен');
  });

  it('делает название из имени файла', () => {
    expect(titleFromFileName('razminka_2026.mp4')).toBe('razminka_2026');
    expect(titleFromFileName('.mp4')).toBe('Без названия');
  });
});

describe('база материалов', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  function makeMaterials() {
    const video = createMaterial(db, {
      type: 'video_file',
      title: 'Разминка на видео',
      localPath: 'materials/a.mp4',
      fileSizeBytes: 900,
    });
    const audio = createMaterial(db, {
      type: 'audio_file',
      title: 'Медленный трек',
      localPath: 'materials/b.mp3',
      fileSizeBytes: 300,
    });
    const link = createMaterial(db, {
      type: 'video_link',
      title: 'Комбинация с YouTube',
      url: 'https://youtu.be/abc',
    });

    return { video, audio, link };
  }

  it('фильтрует по типу', () => {
    makeMaterials();

    expect(listMaterials(db, { types: ['video_file', 'video_link'] })).toHaveLength(2);
    expect(listMaterials(db, { types: ['audio_file'] })).toHaveLength(1);
  });

  it('ищет по русскому названию без учёта регистра', () => {
    makeMaterials();

    expect(listMaterials(db, { search: 'РАЗМИНКА' })).toHaveLength(1);
    expect(listMaterials(db, { search: 'прыжки' })).toHaveLength(0);
  });

  it('сортирует по размеру файла', () => {
    makeMaterials();

    const bySize = listMaterials(db, { sort: 'size_desc' });
    expect(bySize[0]?.title).toBe('Разминка на видео');
  });

  it('фильтрует по тегам', () => {
    const { video, audio } = makeMaterials();
    const warmup = ensureTag(db, 'разогрев');
    addTagToMaterial(db, video.id, warmup.id);

    expect(listMaterials(db, { tagIds: [warmup.id] })).toHaveLength(1);

    addTagToMaterial(db, audio.id, warmup.id);
    expect(listMaterials(db, { tagIds: [warmup.id] })).toHaveLength(2);
  });

  it('не создаёт одинаковые теги дважды', () => {
    const first = ensureTag(db, 'партер');
    const second = ensureTag(db, 'партер');

    expect(second.id).toBe(first.id);
  });

  it('добавляет и снимает теги с материала', () => {
    const { video } = makeMaterials();
    const tag = ensureTag(db, 'прыжки');

    addTagToMaterial(db, video.id, tag.id);
    addTagToMaterial(db, video.id, tag.id); // повтор не должен ломать связь
    expect(listMaterialTags(db, video.id)).toHaveLength(1);

    removeTagFromMaterial(db, video.id, tag.id);
    expect(listMaterialTags(db, video.id)).toHaveLength(0);
  });

  it('разбирает перечисление тегов через запятую', () => {
    expect(parseTagNames('партер, трюк')).toEqual(['партер', 'трюк']);
    expect(parseTagNames(' партер ')).toEqual(['партер']);
    expect(parseTagNames('партер, партер')).toEqual(['партер']);
    expect(parseTagNames('  ,  ')).toEqual([]);
  });

  it('удаляет тег, не трогая материалы', () => {
    const { video, audio } = makeMaterials();
    const tag = ensureTag(db, 'партер');
    addTagToMaterial(db, video.id, tag.id);
    addTagToMaterial(db, audio.id, tag.id);

    expect(countTagUsage(db, tag.id)).toBe(2);

    deleteTag(db, tag.id);

    expect(listMaterialTags(db, video.id)).toHaveLength(0);
    expect(listMaterials(db)).toHaveLength(3);
  });

  it('показывает все уроки, где используется материал', () => {
    const { video } = makeMaterials();
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });

    for (const date of ['2026-09-01', '2026-09-08']) {
      const lesson = createLesson(db, {
        groupId: group.id,
        orderNumber: 1,
        title: `Урок ${date}`,
        date,
        plannedMinutes: 60,
      });
      const block = createBlock(db, { lessonId: lesson.id, title: 'Разминка' });
      attachMaterialToBlock(db, { blockId: block.id, materialId: video.id });
    }

    const usage = getMaterialUsage(db, video.id);
    expect(usage).toHaveLength(2);
    expect(usage[0]?.lessonDate).toBe('2026-09-08');
  });
});
