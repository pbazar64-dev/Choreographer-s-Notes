import type { Group } from '@/db/schema';
import type { AppDatabase } from '@/db/client';
import { nextLessonOrderNumber } from '@/db/repositories/groups.repo';
import { createLesson } from '@/db/repositories/lessons.repo';
import { todayKey } from '@/lib/date';

/**
 * Новый конспект в группе: номер по порядку, длительность из настроек группы.
 * Шаблон применяется отдельно, на экране выбора шаблона.
 */
export function createLessonForGroup(
  db: AppDatabase,
  group: Group,
  dateKey = todayKey(),
  options: { startTime?: string | null; plannedMinutes?: number } = {},
) {
  const orderNumber = nextLessonOrderNumber(db, group.id);

  return createLesson(db, {
    groupId: group.id,
    orderNumber,
    title: `Урок ${orderNumber}`,
    date: dateKey,
    startTime: options.startTime ?? null,
    plannedMinutes: options.plannedMinutes ?? group.defaultLessonMinutes,
    status: options.startTime ? 'planned' : 'draft',
  });
}
