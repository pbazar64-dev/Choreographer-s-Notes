import { createGroup } from '@/db/repositories/groups.repo';
import {
  createLesson,
  getUpcomingLesson,
  listLessonsBetween,
  listLessonsByDate,
  setLessonStatus,
} from '@/db/repositories/lessons.repo';
import type { AppDatabase } from '@/db/client';
import { getWeekDays, shiftWeek } from '@/features/calendar/weekDays';
import { startOfWeek } from '@/lib/date';

import { createTestDb } from './helpers/testDb';

describe('неделя начинается с понедельника', () => {
  it('строит неделю от понедельника до воскресенья', () => {
    // 2026-09-10 — четверг
    const days = getWeekDays('2026-09-10', '2026-09-10');

    expect(days).toHaveLength(7);
    expect(days[0]?.dateKey).toBe('2026-09-07');
    expect(days[6]?.dateKey).toBe('2026-09-13');
    expect(days[0]?.weekdayShort).toBe('пн');
    expect(days[6]?.weekdayShort).toBe('вс');
  });

  it('отмечает сегодняшний день', () => {
    const days = getWeekDays('2026-09-10', '2026-09-10');
    expect(days.filter((day) => day.isToday).map((day) => day.dateKey)).toEqual(['2026-09-10']);
  });

  it('воскресенье относится к своей неделе, а не к следующей', () => {
    expect(startOfWeek('2026-09-13')).toBe('2026-09-07');
    expect(startOfWeek('2026-09-14')).toBe('2026-09-14');
  });

  it('листает недели', () => {
    expect(shiftWeek('2026-09-10', 1)).toBe('2026-09-17');
    expect(shiftWeek('2026-09-10', -2)).toBe('2026-08-27');
  });
});

describe('уроки в календаре', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  function makeLesson(groupId: number, date: string, startTime?: string, title = 'Урок') {
    return createLesson(db, {
      groupId,
      orderNumber: 1,
      title,
      date,
      startTime: startTime ?? null,
      plannedMinutes: 60,
      status: 'planned',
    });
  }

  it('показывает уроки выбранного дня по времени начала', () => {
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    makeLesson(group.id, '2026-09-10', '19:30', 'Вечерний');
    makeLesson(group.id, '2026-09-10', '16:00', 'Дневной');
    makeLesson(group.id, '2026-09-11', '16:00', 'Завтрашний');

    const day = listLessonsByDate(db, '2026-09-10');
    expect(day.map((lesson) => lesson.title)).toEqual(['Дневной', 'Вечерний']);
  });

  it('отдаёт цвет группы для точек в календаре', () => {
    const kids = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    const adults = createGroup(db, { name: 'Взрослые 16+', colorHex: '#4F7A6B' });
    makeLesson(kids.id, '2026-09-10');
    makeLesson(adults.id, '2026-09-10');

    const colors = listLessonsByDate(db, '2026-09-10').map((lesson) => lesson.groupColorHex);
    expect(colors).toEqual(['#C2703D', '#4F7A6B']);
  });

  it('выбирает уроки за период, включая границы', () => {
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    makeLesson(group.id, '2026-08-31');
    makeLesson(group.id, '2026-09-01');
    makeLesson(group.id, '2026-09-30');
    makeLesson(group.id, '2026-10-01');

    const period = listLessonsBetween(db, '2026-09-01', '2026-09-30');
    expect(period.map((lesson) => lesson.date)).toEqual(['2026-09-01', '2026-09-30']);
  });

  it('ближайшим считает самый ранний непроведённый урок начиная с сегодня', () => {
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    makeLesson(group.id, '2026-09-05', '16:00', 'Прошедший');
    const done = makeLesson(group.id, '2026-09-10', '16:00', 'Уже проведён');
    makeLesson(group.id, '2026-09-10', '19:30', 'Тот самый');
    makeLesson(group.id, '2026-09-12', '16:00', 'Позже');

    setLessonStatus(db, done.id, 'done');

    expect(getUpcomingLesson(db, '2026-09-10')?.title).toBe('Тот самый');
  });

  it('возвращает null, когда впереди уроков нет', () => {
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    makeLesson(group.id, '2026-09-01');

    expect(getUpcomingLesson(db, '2026-09-10')).toBeNull();
  });
});
