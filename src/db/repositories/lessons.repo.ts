import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { matchesSearch, normalizeSearch } from '@/lib/search';

import type { AppDatabase } from '../client';
import {
  groups,
  lessonBlocks,
  lessons,
  type Lesson,
  type LessonStatus,
  type NewLesson,
} from '../schema';

export type LessonListItem = Lesson & {
  groupName: string;
  groupColorHex: string;
};

const withGroup = {
  lesson: lessons,
  groupName: groups.name,
  groupColorHex: groups.colorHex,
};

function mapLesson(row: {
  lesson: Lesson;
  groupName: string;
  groupColorHex: string;
}): LessonListItem {
  return { ...row.lesson, groupName: row.groupName, groupColorHex: row.groupColorHex };
}

export function getLesson(db: AppDatabase, id: number): LessonListItem | null {
  const row = db
    .select(withGroup)
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(lessons.id, id))
    .get();

  return row ? mapLesson(row) : null;
}

/** Лента конспектов группы (п. 4.2 ТЗ), с поиском по названию и тексту блоков. */
export function listGroupLessons(
  db: AppDatabase,
  groupId: number,
  options: { newestFirst?: boolean; search?: string } = {},
): LessonListItem[] {
  const { newestFirst = true, search } = options;

  const rows = db
    .select(withGroup)
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(lessons.groupId, groupId))
    .orderBy(newestFirst ? desc(lessons.date) : asc(lessons.date), asc(lessons.startTime))
    .all()
    .map(mapLesson);

  const term = normalizeSearch(search ?? '');
  if (!term) return rows;

  // Поиск идёт и по тексту блоков, поэтому подтягиваем их одним запросом.
  const blockTextByLesson = new Map<number, string>();
  if (rows.length > 0) {
    const blocks = db
      .select({
        lessonId: lessonBlocks.lessonId,
        title: lessonBlocks.title,
        notes: lessonBlocks.notes,
      })
      .from(lessonBlocks)
      .where(
        inArray(
          lessonBlocks.lessonId,
          rows.map((row) => row.id),
        ),
      )
      .all();

    for (const block of blocks) {
      const previous = blockTextByLesson.get(block.lessonId) ?? '';
      blockTextByLesson.set(block.lessonId, `${previous} ${block.title} ${block.notes}`);
    }
  }

  return rows.filter(
    (lesson) =>
      matchesSearch(lesson.title, term) ||
      matchesSearch(lesson.goal, term) ||
      matchesSearch(blockTextByLesson.get(lesson.id) ?? '', term),
  );
}

/** Уроки конкретного дня — для календаря. */
export function listLessonsByDate(db: AppDatabase, dateKey: string): LessonListItem[] {
  const rows = db
    .select(withGroup)
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(lessons.date, dateKey))
    .orderBy(asc(lessons.startTime))
    .all();

  return rows.map(mapLesson);
}

/** Уроки за период — для точек в месячном виде календаря. */
export function listLessonsBetween(db: AppDatabase, fromKey: string, toKey: string) {
  return db
    .select(withGroup)
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(and(gte(lessons.date, fromKey), sql`${lessons.date} <= ${toKey}`))
    .orderBy(asc(lessons.date), asc(lessons.startTime))
    .all()
    .map(mapLesson);
}

/** Ближайший урок «сегодня и позже» — карточка на календаре. */
export function getUpcomingLesson(db: AppDatabase, fromKey: string): LessonListItem | null {
  const row = db
    .select(withGroup)
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(and(gte(lessons.date, fromKey), sql`${lessons.status} <> 'done'`))
    .orderBy(asc(lessons.date), asc(lessons.startTime))
    .limit(1)
    .get();

  return row ? mapLesson(row) : null;
}

export function createLesson(db: AppDatabase, values: NewLesson): Lesson {
  return db.insert(lessons).values(values).returning().get();
}

export function updateLesson(
  db: AppDatabase,
  id: number,
  values: Partial<NewLesson>,
): Lesson | null {
  return (
    db
      .update(lessons)
      .set({ ...values, updatedAt: Date.now() })
      .where(eq(lessons.id, id))
      .returning()
      .get() ?? null
  );
}

export function setLessonStatus(db: AppDatabase, id: number, status: LessonStatus): void {
  db.update(lessons).set({ status, updatedAt: Date.now() }).where(eq(lessons.id, id)).run();
}

/** Удаляет урок вместе с блоками и связками, но не трогает материалы общей базы. */
export function deleteLesson(db: AppDatabase, id: number): void {
  db.delete(lessons).where(eq(lessons.id, id)).run();
}
