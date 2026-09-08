import type { Group } from '@/db/schema';
import type { AppDatabase } from '@/db/client';
import { nextLessonOrderNumber } from '@/db/repositories/groups.repo';
import { createLesson } from '@/db/repositories/lessons.repo';
import { todayKey } from '@/lib/date';

/**
 * Новый конспект в группе: номер по порядку, длительность из настроек группы.
 * Применение шаблона группы подключается на Э6.
 */
export function createLessonForGroup(db: AppDatabase, group: Group, dateKey = todayKey()) {
  const orderNumber = nextLessonOrderNumber(db, group.id);

  return createLesson(db, {
    groupId: group.id,
    orderNumber,
    title: `Урок ${orderNumber}`,
    date: dateKey,
    plannedMinutes: group.defaultLessonMinutes,
    status: 'draft',
  });
}
