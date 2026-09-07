import {
  attachMaterialToBlock,
  createMaterial,
  deleteMaterial,
  getMaterialUsage,
  listMaterials,
} from '@/db/repositories/materials.repo';
import {
  createBlock,
  listBlocks,
  reorderBlocks,
  sumPlannedMinutes,
} from '@/db/repositories/blocks.repo';
import {
  countGroupLessons,
  createGroup,
  deleteGroup,
  listGroups,
  nextLessonOrderNumber,
  setGroupArchived,
} from '@/db/repositories/groups.repo';
import { createLesson, deleteLesson, listGroupLessons } from '@/db/repositories/lessons.repo';
import { getSetting, setSetting, SETTINGS_KEYS } from '@/db/repositories/settings.repo';
import type { AppDatabase } from '@/db/client';

import { createTestDb } from './helpers/testDb';

let db: AppDatabase;

beforeEach(() => {
  db = createTestDb();
});

function makeGroup(name = 'Дети 8–10') {
  return createGroup(db, { name, colorHex: '#C2703D', defaultLessonMinutes: 60 });
}

function makeLesson(groupId: number, date = '2026-09-10') {
  return createLesson(db, {
    groupId,
    orderNumber: nextLessonOrderNumber(db, groupId),
    title: 'Урок',
    date,
    plannedMinutes: 60,
  });
}

describe('группы', () => {
  it('считает конспекты и дату последнего урока', () => {
    const group = makeGroup();
    makeLesson(group.id, '2026-09-01');
    makeLesson(group.id, '2026-09-08');

    const [item] = listGroups(db);
    expect(item?.lessonsCount).toBe(2);
    expect(item?.lastLessonDate).toBe('2026-09-08');
  });

  it('скрывает архивные группы, пока их не попросят', () => {
    const group = makeGroup();
    setGroupArchived(db, group.id, true);

    expect(listGroups(db)).toHaveLength(0);
    expect(listGroups(db, true)).toHaveLength(1);
  });

  it('нумерует уроки по порядку', () => {
    const group = makeGroup();
    expect(nextLessonOrderNumber(db, group.id)).toBe(1);
    makeLesson(group.id);
    expect(nextLessonOrderNumber(db, group.id)).toBe(2);
  });

  it('удаляет уроки вместе с группой', () => {
    const group = makeGroup();
    makeLesson(group.id);
    deleteGroup(db, group.id);

    expect(countGroupLessons(db, group.id)).toBe(0);
  });
});

describe('блоки урока', () => {
  it('считает суммарное плановое время', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    createBlock(db, { lessonId: lesson.id, title: 'Разминка', kind: 'warmup', plannedMinutes: 15 });
    createBlock(db, { lessonId: lesson.id, title: 'Кросс', kind: 'cross', plannedMinutes: 25 });

    expect(sumPlannedMinutes(db, lesson.id)).toBe(40);
  });

  it('сохраняет новый порядок после перетаскивания', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    const first = createBlock(db, { lessonId: lesson.id, title: 'A', sortOrder: 0 });
    const second = createBlock(db, { lessonId: lesson.id, title: 'B', sortOrder: 1 });

    reorderBlocks(db, [second.id, first.id]);

    expect(listBlocks(db, lesson.id).map((block) => block.title)).toEqual(['B', 'A']);
  });
});

describe('материалы живут отдельно от конспектов', () => {
  it('удаление урока не удаляет материал из общей базы', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    const block = createBlock(db, { lessonId: lesson.id, title: 'Разминка' });
    const material = createMaterial(db, {
      type: 'video_link',
      title: 'Разминка',
      url: 'https://example.com/v',
    });
    attachMaterialToBlock(db, { blockId: block.id, materialId: material.id });

    deleteLesson(db, lesson.id);

    expect(listMaterials(db)).toHaveLength(1);
    expect(getMaterialUsage(db, material.id)).toHaveLength(0);
  });

  it('показывает, где используется материал', () => {
    const group = makeGroup();
    const first = makeLesson(group.id, '2026-09-01');
    const second = makeLesson(group.id, '2026-09-08');
    const blockA = createBlock(db, { lessonId: first.id, title: 'Разминка' });
    const blockB = createBlock(db, { lessonId: second.id, title: 'Разминка' });
    const material = createMaterial(db, {
      type: 'video_link',
      title: 'Общая разминка',
      url: 'https://example.com/v',
    });

    attachMaterialToBlock(db, { blockId: blockA.id, materialId: material.id });
    attachMaterialToBlock(db, { blockId: blockB.id, materialId: material.id, startTimeSec: 30 });

    const usage = getMaterialUsage(db, material.id);
    expect(usage).toHaveLength(2);
    expect(usage.map((item) => item.blockTitle)).toEqual(['Разминка', 'Разминка']);
  });

  it('удаление материала снимает все его связки', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    const block = createBlock(db, { lessonId: lesson.id, title: 'Разминка' });
    const material = createMaterial(db, {
      type: 'image',
      title: 'Схема',
      localPath: 'materials/a.jpg',
    });
    attachMaterialToBlock(db, { blockId: block.id, materialId: material.id });

    deleteMaterial(db, material.id);

    expect(listMaterials(db)).toHaveLength(0);
    expect(sumPlannedMinutes(db, lesson.id)).toBe(0);
    expect(listBlocks(db, lesson.id)).toHaveLength(1);
  });
});

describe('поиск конспектов', () => {
  it('ищет по названию урока и по тексту блоков', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    createBlock(db, { lessonId: lesson.id, title: 'Партер', notes: 'Перекаты через спину' });

    expect(listGroupLessons(db, group.id, { search: 'перекаты' })).toHaveLength(1);
    expect(listGroupLessons(db, group.id, { search: 'прыжки' })).toHaveLength(0);
  });
});

describe('настройки', () => {
  it('перезаписывает значение по ключу', () => {
    setSetting(db, SETTINGS_KEYS.themePreference, 'dark');
    setSetting(db, SETTINGS_KEYS.themePreference, 'light');

    expect(getSetting(db, SETTINGS_KEYS.themePreference)).toBe('light');
  });
});
