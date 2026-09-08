import { createBlock, listBlocks, sumPlannedMinutes } from '@/db/repositories/blocks.repo';
import { createGroup, deleteGroup, getGroup, updateGroup } from '@/db/repositories/groups.repo';
import { createLesson } from '@/db/repositories/lessons.repo';
import {
  applyTemplateToLesson,
  createTemplate,
  createTemplateBlock,
  createTemplateFromLesson,
  deleteTemplate,
  listTemplateBlocks,
  listTemplates,
  listTemplatesForGroup,
  reorderTemplateBlocks,
  templateTotalMinutes,
} from '@/db/repositories/templates.repo';
import type { AppDatabase } from '@/db/client';

import { createTestDb } from './helpers/testDb';

let db: AppDatabase;

beforeEach(() => {
  db = createTestDb();
});

function makeGroup(name = 'Дети 8–10') {
  return createGroup(db, { name, colorHex: '#C2703D', defaultLessonMinutes: 60 });
}

function makeLesson(groupId: number) {
  return createLesson(db, {
    groupId,
    orderNumber: 1,
    title: 'Урок 1',
    date: '2026-09-10',
    plannedMinutes: 60,
  });
}

function makeTemplate(groupId: number | null, name = 'Базовый урок') {
  return createTemplate(db, { name, groupId }, [
    { title: 'Разминка', kind: 'warmup', plannedMinutes: 15, defaultNotes: 'По кругу' },
    { title: 'Партер', kind: 'floor', plannedMinutes: 15, defaultNotes: '' },
    { title: 'Кросс', kind: 'cross', plannedMinutes: 15, defaultNotes: '' },
    { title: 'Комбинация', kind: 'combination', plannedMinutes: 15, defaultNotes: '' },
  ]);
}

describe('шаблоны', () => {
  it('группе доступны её шаблоны и общие, но не чужие', () => {
    const kids = makeGroup('Дети 8–10');
    const adults = makeGroup('Взрослые 16+');
    makeTemplate(kids.id, 'Детский');
    makeTemplate(adults.id, 'Взрослый');
    makeTemplate(null, 'Общий');

    const forKids = listTemplatesForGroup(db, kids.id).map((template) => template.name);
    expect(forKids).toContain('Детский');
    expect(forKids).toContain('Общий');
    expect(forKids).not.toContain('Взрослый');
  });

  it('разворачивает шаблон в блоки урока с заметками по умолчанию', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);
    const lesson = makeLesson(group.id);

    const added = applyTemplateToLesson(db, template.id, lesson.id);

    expect(added).toBe(4);
    const blocks = listBlocks(db, lesson.id);
    expect(blocks.map((block) => block.title)).toEqual([
      'Разминка',
      'Партер',
      'Кросс',
      'Комбинация',
    ]);
    expect(blocks[0]?.notes).toBe('По кругу');
    expect(sumPlannedMinutes(db, lesson.id)).toBe(60);
  });

  it('дописывает блоки шаблона в конец, а не поверх существующих', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);
    const lesson = makeLesson(group.id);
    createBlock(db, { lessonId: lesson.id, title: 'Своя разминка', plannedMinutes: 10 });

    applyTemplateToLesson(db, template.id, lesson.id);

    const titles = listBlocks(db, lesson.id).map((block) => block.title);
    expect(titles[0]).toBe('Своя разминка');
    expect(titles).toHaveLength(5);
    expect(new Set(listBlocks(db, lesson.id).map((block) => block.sortOrder)).size).toBe(5);
  });

  it('сохраняет структуру конспекта как шаблон', () => {
    const group = makeGroup();
    const lesson = makeLesson(group.id);
    createBlock(db, {
      lessonId: lesson.id,
      title: 'Разминка',
      kind: 'warmup',
      plannedMinutes: 20,
      notes: 'Следить за стопами',
      sortOrder: 0,
    });
    createBlock(db, {
      lessonId: lesson.id,
      title: 'Импровизация',
      kind: 'improv',
      plannedMinutes: 40,
      sortOrder: 1,
    });

    const template = createTemplateFromLesson(db, lesson.id, 'Мой шаблон', group.id);
    expect(template).not.toBeNull();
    if (!template) return;

    const blocks = listTemplateBlocks(db, template.id);
    expect(blocks.map((block) => block.title)).toEqual(['Разминка', 'Импровизация']);
    expect(blocks[0]?.defaultNotes).toBe('Следить за стопами');
    expect(templateTotalMinutes(blocks)).toBe(60);
  });

  it('меняет порядок блоков шаблона', () => {
    const group = makeGroup();
    const template = createTemplate(db, { name: 'Пустой', groupId: group.id });
    const first = createTemplateBlock(db, template.id, { title: 'A', plannedMinutes: 10 });
    const second = createTemplateBlock(db, template.id, { title: 'B', plannedMinutes: 10 });

    reorderTemplateBlocks(db, [second.id, first.id]);

    expect(listTemplateBlocks(db, template.id).map((block) => block.title)).toEqual(['B', 'A']);
  });

  it('удаление шаблона не трогает уже созданные уроки', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);
    const lesson = makeLesson(group.id);
    applyTemplateToLesson(db, template.id, lesson.id);

    deleteTemplate(db, template.id);

    expect(listTemplates(db)).toHaveLength(0);
    expect(listBlocks(db, lesson.id)).toHaveLength(4);
  });

  it('удаление шаблона снимает его с группы по умолчанию', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);
    updateGroup(db, group.id, { defaultTemplateId: template.id });

    deleteTemplate(db, template.id);

    expect(getGroup(db, group.id)?.defaultTemplateId).toBeNull();
  });

  it('шаблон по умолчанию хранится в группе', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);

    updateGroup(db, group.id, { defaultTemplateId: template.id });
    expect(getGroup(db, group.id)?.defaultTemplateId).toBe(template.id);
  });

  it('удаление группы делает её шаблон общим, а не удаляет его', () => {
    const group = makeGroup();
    const template = makeTemplate(group.id);

    deleteGroup(db, group.id);

    const remaining = listTemplates(db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(template.id);
    expect(remaining[0]?.groupId).toBeNull();
  });
});
