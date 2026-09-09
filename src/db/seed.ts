import { eq } from 'drizzle-orm';

import type { AppDatabase } from './client';
import { getSetting, setSetting, SETTINGS_KEYS } from './repositories/settings.repo';
import {
  blockMaterials,
  groups,
  lessonBlocks,
  lessons,
  materialTags,
  materials,
  tags,
  templateBlocks,
  templates,
} from './schema';

const SEED_VERSION = '1';

/**
 * Тестовые данные для разработки: 2 группы, 3 конспекта, 5 материалов.
 * Материалы — ссылки, чтобы сид не зависел от файлов на устройстве.
 * Выполняется один раз: отметка хранится в app_settings.
 */
export function seedIfEmpty(db: AppDatabase): boolean {
  if (getSetting(db, SETTINGS_KEYS.seedVersion) === SEED_VERSION) return false;

  const existing = db.select({ id: groups.id }).from(groups).limit(1).get();
  if (existing) {
    setSetting(db, SETTINGS_KEYS.seedVersion, SEED_VERSION);
    return false;
  }

  db.transaction((tx) => {
    const kids = tx
      .insert(groups)
      .values({
        name: 'Дети 8–10',
        description: 'Контемпорари, младшая группа',
        colorHex: '#E0B49E',
        defaultLessonMinutes: 60,
      })
      .returning()
      .get();

    const adults = tx
      .insert(groups)
      .values({
        name: 'Взрослые 16+',
        description: 'Контемпорари, вечерняя группа',
        colorHex: '#A9C6B4',
        defaultLessonMinutes: 90,
      })
      .returning()
      .get();

    const kidsTemplate = tx
      .insert(templates)
      .values({ name: 'Базовый урок 8–10', groupId: kids.id })
      .returning()
      .get();

    const templateStructure = [
      {
        title: 'Разминка',
        kind: 'warmup',
        plannedMinutes: 15,
        defaultNotes: 'Суставная, по кругу',
      },
      { title: 'Партер', kind: 'floor', plannedMinutes: 15, defaultNotes: '' },
      { title: 'Кросс', kind: 'cross', plannedMinutes: 15, defaultNotes: 'По диагонали' },
      { title: 'Комбинация', kind: 'combination', plannedMinutes: 15, defaultNotes: '' },
    ];

    templateStructure.forEach((block, index) => {
      tx.insert(templateBlocks)
        .values({ ...block, templateId: kidsTemplate.id, sortOrder: index })
        .run();
    });

    tx.update(groups)
      .set({ defaultTemplateId: kidsTemplate.id })
      .where(eq(groups.id, kids.id))
      .run();

    const materialRows = [
      {
        type: 'video_link' as const,
        title: 'Разминка: суставная гимнастика',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Пример разогрева для младшей группы',
        durationSec: 420,
      },
      {
        type: 'video_link' as const,
        title: 'Партер: перекаты и волна',
        url: 'https://vk.com/video-12345_67890',
        description: '',
        durationSec: 300,
      },
      {
        type: 'video_link' as const,
        title: 'Комбинация: связка на 8 счётов',
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        description: 'Разбор по частям',
        durationSec: 240,
      },
      {
        type: 'audio_link' as const,
        title: 'Медленный трек для растяжки',
        url: 'https://example.com/slow-track.mp3',
        description: '',
        durationSec: 360,
      },
      {
        type: 'audio_link' as const,
        title: 'Ритмичный трек для кросса',
        url: 'https://example.com/cross-track.mp3',
        description: '',
        durationSec: 210,
      },
    ];

    const createdMaterials = materialRows.map((row) =>
      tx.insert(materials).values(row).returning().get(),
    );

    const tagNames = ['разогрев', 'партер', 'комбинация', 'медленная', '8-10 лет'];
    const createdTags = tagNames.map((name) => tx.insert(tags).values({ name }).returning().get());

    const tagLinks: [number, number][] = [
      [0, 0],
      [0, 4],
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    tagLinks.forEach(([materialIndex, tagIndex]) => {
      const material = createdMaterials[materialIndex];
      const tag = createdTags[tagIndex];
      if (material && tag) {
        tx.insert(materialTags).values({ materialId: material.id, tagId: tag.id }).run();
      }
    });

    const lessonRows = [
      {
        groupId: kids.id,
        orderNumber: 1,
        title: 'Урок 1: волна и перекаты',
        date: shiftDate(-7),
        startTime: '16:00',
        plannedMinutes: 60,
        status: 'done' as const,
        goal: 'Освоить перекат через спину',
      },
      {
        groupId: kids.id,
        orderNumber: 2,
        title: 'Урок 2: кросс по диагонали',
        date: shiftDate(1),
        startTime: '16:00',
        plannedMinutes: 60,
        status: 'planned' as const,
        goal: 'Научиться держать линию в кроссе',
      },
      {
        groupId: adults.id,
        orderNumber: 1,
        title: 'Импровизация: работа с весом',
        date: shiftDate(2),
        startTime: '19:30',
        plannedMinutes: 90,
        status: 'planned' as const,
        goal: 'Почувствовать опору партнёра',
      },
    ];

    const createdLessons = lessonRows.map((row) =>
      tx.insert(lessons).values(row).returning().get(),
    );

    const blockRows = [
      {
        lessonIndex: 0,
        title: 'Разминка',
        kind: 'warmup',
        plannedMinutes: 15,
        notes: 'По кругу, следить за стопами',
      },
      {
        lessonIndex: 0,
        title: 'Партер',
        kind: 'floor',
        plannedMinutes: 20,
        notes: 'Перекаты, волна от копчика',
      },
      { lessonIndex: 0, title: 'Комбинация', kind: 'combination', plannedMinutes: 25, notes: '' },
      { lessonIndex: 1, title: 'Разминка', kind: 'warmup', plannedMinutes: 15, notes: '' },
      {
        lessonIndex: 1,
        title: 'Кросс',
        kind: 'cross',
        plannedMinutes: 25,
        notes: 'Шаг-подскок, по диагонали',
      },
      {
        lessonIndex: 1,
        title: 'Растяжка',
        kind: 'stretch',
        plannedMinutes: 20,
        notes: 'Спокойный трек',
      },
      { lessonIndex: 2, title: 'Разогрев', kind: 'warmup', plannedMinutes: 20, notes: '' },
      {
        lessonIndex: 2,
        title: 'Импровизация',
        kind: 'improv',
        plannedMinutes: 40,
        notes: 'Задание: вес и опора',
      },
      { lessonIndex: 2, title: 'Растяжка', kind: 'stretch', plannedMinutes: 30, notes: '' },
    ];

    const createdBlocks = blockRows.map((row, index) => {
      const lesson = createdLessons[row.lessonIndex];
      if (!lesson) throw new Error('Сид: не найден урок для блока');
      return tx
        .insert(lessonBlocks)
        .values({
          lessonId: lesson.id,
          sortOrder: index,
          title: row.title,
          kind: row.kind,
          plannedMinutes: row.plannedMinutes,
          notes: row.notes,
        })
        .returning()
        .get();
    });

    // Одно и то же видео разминки используется в двух уроках — это ключевая идея базы материалов.
    const attachments: {
      blockIndex: number;
      materialIndex: number;
      comment: string;
      startTimeSec?: number;
    }[] = [
      { blockIndex: 0, materialIndex: 0, comment: 'Берём только первые 3 минуты' },
      { blockIndex: 1, materialIndex: 1, comment: '' },
      { blockIndex: 2, materialIndex: 2, comment: 'Медленнее в 2 раза', startTimeSec: 45 },
      { blockIndex: 3, materialIndex: 0, comment: '' },
      { blockIndex: 5, materialIndex: 3, comment: '' },
      { blockIndex: 4, materialIndex: 4, comment: '' },
    ];

    attachments.forEach((item, index) => {
      const block = createdBlocks[item.blockIndex];
      const material = createdMaterials[item.materialIndex];
      if (!block || !material) return;
      tx.insert(blockMaterials)
        .values({
          blockId: block.id,
          materialId: material.id,
          sortOrder: index,
          comment: item.comment,
          startTimeSec: item.startTimeSec ?? null,
        })
        .run();
    });
  });

  setSetting(db, SETTINGS_KEYS.seedVersion, SEED_VERSION);
  return true;
}

function shiftDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
