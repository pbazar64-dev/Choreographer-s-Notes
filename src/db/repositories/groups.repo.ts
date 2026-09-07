import { and, asc, count, desc, eq, max } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import { groups, lessons, type Group, type NewGroup } from '../schema';

export type GroupListItem = Group & {
  lessonsCount: number;
  lastLessonDate: string | null;
};

/** Список групп с числом конспектов и датой последнего урока (п. 4.2 ТЗ). */
export function listGroups(db: AppDatabase, includeArchived = false): GroupListItem[] {
  const rows = db
    .select({
      group: groups,
      lessonsCount: count(lessons.id),
      lastLessonDate: max(lessons.date),
    })
    .from(groups)
    .leftJoin(lessons, eq(lessons.groupId, groups.id))
    .where(includeArchived ? undefined : eq(groups.isArchived, false))
    .groupBy(groups.id)
    .orderBy(asc(groups.isArchived), asc(groups.name))
    .all();

  return rows.map((row) => ({
    ...row.group,
    lessonsCount: Number(row.lessonsCount ?? 0),
    lastLessonDate: (row.lastLessonDate as string | null) ?? null,
  }));
}

export function getGroup(db: AppDatabase, id: number): Group | null {
  return db.select().from(groups).where(eq(groups.id, id)).get() ?? null;
}

export function createGroup(db: AppDatabase, values: NewGroup): Group {
  return db.insert(groups).values(values).returning().get();
}

export function updateGroup(db: AppDatabase, id: number, values: Partial<NewGroup>): Group | null {
  return db.update(groups).set(values).where(eq(groups.id, id)).returning().get() ?? null;
}

export function setGroupArchived(db: AppDatabase, id: number, isArchived: boolean): void {
  db.update(groups).set({ isArchived }).where(eq(groups.id, id)).run();
}

/** Удаление группы удаляет её уроки (каскадом), но не трогает материалы. */
export function deleteGroup(db: AppDatabase, id: number): void {
  db.delete(groups).where(eq(groups.id, id)).run();
}

export function countGroupLessons(db: AppDatabase, groupId: number): number {
  const row = db
    .select({ value: count(lessons.id) })
    .from(lessons)
    .where(eq(lessons.groupId, groupId))
    .get();

  return Number(row?.value ?? 0);
}

/** Следующий порядковый номер урока в группе. */
export function nextLessonOrderNumber(db: AppDatabase, groupId: number): number {
  const row = db
    .select({ value: max(lessons.orderNumber) })
    .from(lessons)
    .where(eq(lessons.groupId, groupId))
    .get();

  return Number(row?.value ?? 0) + 1;
}

/** Последний по дате урок группы — для карточки в списке групп. */
export function getLastLesson(db: AppDatabase, groupId: number) {
  return (
    db
      .select()
      .from(lessons)
      .where(and(eq(lessons.groupId, groupId)))
      .orderBy(desc(lessons.date))
      .limit(1)
      .get() ?? null
  );
}
