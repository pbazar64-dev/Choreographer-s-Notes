import { DATE_KEY_FORMAT, dayjs } from '@/lib/date';

/** Дни недели по ISO: 1 — понедельник, 7 — воскресенье. */
export const WEEKDAYS = [
  { value: 1, short: 'пн', label: 'Понедельник' },
  { value: 2, short: 'вт', label: 'Вторник' },
  { value: 3, short: 'ср', label: 'Среда' },
  { value: 4, short: 'чт', label: 'Четверг' },
  { value: 5, short: 'пт', label: 'Пятница' },
  { value: 6, short: 'сб', label: 'Суббота' },
  { value: 7, short: 'вс', label: 'Воскресенье' },
] as const;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

export function weekdayOf(dateKey: string): number {
  return dayjs(dateKey, DATE_KEY_FORMAT).isoWeekday();
}

export function weekdayShort(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.short ?? '';
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.label ?? '';
}

function minutesOf(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Длительность занятия по слоту. Через полночь занятия не идут — такой слот нулевой. */
export function slotDurationMinutes(startTime: string, endTime: string): number {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return 0;
  return Math.max(0, minutesOf(endTime) - minutesOf(startTime));
}

export type ScheduleSlotLike = {
  id: number;
  groupId: number;
  weekday: number;
  startTime: string;
  endTime: string;
};

export type LessonLike = { groupId: number; date: string; startTime: string | null };

export type ExceptionLike = { slotId: number; date: string };

export type DaySlot<T extends ScheduleSlotLike> = {
  slot: T;
  /** Занятие отменено на эту дату */
  cancelled: boolean;
  /** По слоту уже есть конспект */
  hasLesson: boolean;
  durationMinutes: number;
};

/**
 * Что происходит у групп в конкретный день: слоты расписания, помеченные
 * отменой и наличием конспекта. Чистая функция — вся логика дня проверяется тестами.
 */
export function getDaySlots<T extends ScheduleSlotLike>(
  slots: readonly T[],
  dateKey: string,
  options: { lessons?: readonly LessonLike[]; exceptions?: readonly ExceptionLike[] } = {},
): DaySlot<T>[] {
  const weekday = weekdayOf(dateKey);
  const lessons = options.lessons ?? [];
  const exceptions = options.exceptions ?? [];

  return slots
    .filter((slot) => slot.weekday === weekday)
    .map((slot) => ({
      slot,
      cancelled: exceptions.some(
        (exception) => exception.slotId === slot.id && exception.date === dateKey,
      ),
      hasLesson: lessons.some(
        (lesson) =>
          lesson.groupId === slot.groupId &&
          lesson.date === dateKey &&
          lesson.startTime === slot.startTime,
      ),
      durationMinutes: slotDurationMinutes(slot.startTime, slot.endTime),
    }))
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

/** Даты в периоде, на которые попадает хотя бы одно занятие по расписанию. */
export function scheduledDatesBetween(
  slots: readonly ScheduleSlotLike[],
  fromKey: string,
  toKey: string,
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  if (slots.length === 0) return result;

  let cursor = dayjs(fromKey, DATE_KEY_FORMAT);
  const end = dayjs(toKey, DATE_KEY_FORMAT);

  while (!cursor.isAfter(end, 'day')) {
    const dateKey = cursor.format(DATE_KEY_FORMAT);
    const weekday = cursor.isoWeekday();
    const groupIds = slots.filter((slot) => slot.weekday === weekday).map((slot) => slot.groupId);

    if (groupIds.length > 0) {
      result.set(dateKey, [...new Set(groupIds)]);
    }

    cursor = cursor.add(1, 'day');
  }

  return result;
}

/** «пн, ср 16:00–17:00» — краткая запись расписания для карточки группы. */
export function formatScheduleSummary(slots: readonly ScheduleSlotLike[]): string {
  if (slots.length === 0) return '';

  const byTime = new Map<string, number[]>();
  for (const slot of [...slots].sort((a, b) => a.weekday - b.weekday)) {
    const key = `${slot.startTime}–${slot.endTime}`;
    byTime.set(key, [...(byTime.get(key) ?? []), slot.weekday]);
  }

  return [...byTime.entries()]
    .map(([time, weekdays]) => `${weekdays.map(weekdayShort).join(', ')} ${time}`)
    .join(' · ');
}
