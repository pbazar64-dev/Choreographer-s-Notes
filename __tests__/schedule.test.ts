import { createGroup } from '@/db/repositories/groups.repo';
import {
  cancelSlotOnDate,
  listExceptionsBetween,
  listGroupSlots,
  replaceGroupSlots,
  restoreSlotOnDate,
} from '@/db/repositories/schedule.repo';
import type { AppDatabase } from '@/db/client';
import {
  formatScheduleSummary,
  getDaySlots,
  scheduledDatesBetween,
  slotDurationMinutes,
  weekdayOf,
} from '@/features/schedule/schedule';

import { createTestDb } from './helpers/testDb';

const slots = [
  { id: 1, groupId: 10, weekday: 1, startTime: '16:00', endTime: '17:00' },
  { id: 2, groupId: 10, weekday: 4, startTime: '18:30', endTime: '20:00' },
  { id: 3, groupId: 20, weekday: 4, startTime: '09:00', endTime: '10:00' },
];

describe('расчёт расписания', () => {
  it('определяет день недели по дате', () => {
    expect(weekdayOf('2026-09-07')).toBe(1); // понедельник
    expect(weekdayOf('2026-09-10')).toBe(4); // четверг
    expect(weekdayOf('2026-09-13')).toBe(7); // воскресенье
  });

  it('считает длительность занятия', () => {
    expect(slotDurationMinutes('16:00', '17:00')).toBe(60);
    expect(slotDurationMinutes('18:30', '20:00')).toBe(90);
    expect(slotDurationMinutes('17:00', '16:00')).toBe(0);
    expect(slotDurationMinutes('часик', '17:00')).toBe(0);
  });

  it('выбирает занятия нужного дня недели и сортирует по времени', () => {
    const thursday = getDaySlots(slots, '2026-09-10');

    expect(thursday.map((item) => item.slot.id)).toEqual([3, 2]);
    expect(thursday[0]?.durationMinutes).toBe(60);
    expect(getDaySlots(slots, '2026-09-08')).toHaveLength(0); // вторник
  });

  it('помечает отменённое занятие', () => {
    const [monday] = getDaySlots(slots, '2026-09-07', {
      exceptions: [{ slotId: 1, date: '2026-09-07' }],
    });

    expect(monday?.cancelled).toBe(true);

    const [nextMonday] = getDaySlots(slots, '2026-09-14', {
      exceptions: [{ slotId: 1, date: '2026-09-07' }],
    });
    expect(nextMonday?.cancelled).toBe(false);
  });

  it('помечает занятие, для которого уже есть конспект', () => {
    const [monday] = getDaySlots(slots, '2026-09-07', {
      lessons: [{ groupId: 10, date: '2026-09-07', startTime: '16:00' }],
    });

    expect(monday?.hasLesson).toBe(true);
  });

  it('не считает своим конспект другой группы или другого времени', () => {
    const [monday] = getDaySlots(slots, '2026-09-07', {
      lessons: [
        { groupId: 20, date: '2026-09-07', startTime: '16:00' },
        { groupId: 10, date: '2026-09-07', startTime: '19:00' },
      ],
    });

    expect(monday?.hasLesson).toBe(false);
  });

  it('перечисляет дни расписания в периоде', () => {
    const dates = scheduledDatesBetween(slots, '2026-09-07', '2026-09-13');

    expect([...dates.keys()]).toEqual(['2026-09-07', '2026-09-10']);
    expect(dates.get('2026-09-10')).toEqual([10, 20]);
  });

  it('коротко описывает расписание', () => {
    expect(formatScheduleSummary(slots.filter((slot) => slot.groupId === 10))).toBe(
      'пн 16:00–17:00 · чт 18:30–20:00',
    );
    expect(
      formatScheduleSummary([
        { id: 1, groupId: 1, weekday: 1, startTime: '16:00', endTime: '17:00' },
        { id: 2, groupId: 1, weekday: 3, startTime: '16:00', endTime: '17:00' },
      ]),
    ).toBe('пн, ср 16:00–17:00');
    expect(formatScheduleSummary([])).toBe('');
  });
});

describe('расписание в базе', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  function makeGroup() {
    return createGroup(db, { name: 'Дети 8–10', colorHex: '#E0B49E' });
  }

  it('сохраняет и перечитывает расписание группы', () => {
    const group = makeGroup();
    replaceGroupSlots(db, group.id, [
      { weekday: 4, startTime: '18:30', endTime: '20:00' },
      { weekday: 1, startTime: '16:00', endTime: '17:00' },
    ]);

    const saved = listGroupSlots(db, group.id);
    expect(saved.map((slot) => slot.weekday)).toEqual([1, 4]);
  });

  it('правка расписания не сбрасывает отмены по нетронутым дням', () => {
    const group = makeGroup();
    replaceGroupSlots(db, group.id, [
      { weekday: 1, startTime: '16:00', endTime: '17:00' },
      { weekday: 4, startTime: '18:30', endTime: '20:00' },
    ]);

    const monday = listGroupSlots(db, group.id).find((slot) => slot.weekday === 1);
    if (!monday) throw new Error('слот не создан');
    cancelSlotOnDate(db, monday.id, '2026-09-07');

    // Убираем четверг, понедельник не трогаем.
    replaceGroupSlots(db, group.id, [{ weekday: 1, startTime: '16:00', endTime: '17:00' }]);

    expect(listGroupSlots(db, group.id)).toHaveLength(1);
    expect(listExceptionsBetween(db, '2026-09-01', '2026-09-30')).toHaveLength(1);
  });

  it('отменяет и возвращает занятие, повтор отмены не ломает', () => {
    const group = makeGroup();
    replaceGroupSlots(db, group.id, [{ weekday: 1, startTime: '16:00', endTime: '17:00' }]);
    const slot = listGroupSlots(db, group.id)[0];
    if (!slot) throw new Error('слот не создан');

    cancelSlotOnDate(db, slot.id, '2026-09-07');
    cancelSlotOnDate(db, slot.id, '2026-09-07');
    expect(listExceptionsBetween(db, '2026-09-07', '2026-09-07')).toHaveLength(1);

    restoreSlotOnDate(db, slot.id, '2026-09-07');
    expect(listExceptionsBetween(db, '2026-09-07', '2026-09-07')).toHaveLength(0);
  });

  it('удаление группы уносит её расписание', () => {
    const group = makeGroup();
    replaceGroupSlots(db, group.id, [{ weekday: 1, startTime: '16:00', endTime: '17:00' }]);
    db.run?.('DELETE FROM groups WHERE id = ' + group.id);

    expect(listGroupSlots(db, group.id)).toHaveLength(0);
  });
});
