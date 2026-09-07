import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.locale('ru');

export const DATE_KEY_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';

export { dayjs };

/** Ключ даты 'YYYY-MM-DD' — в этом виде дата хранится в БД. */
export function toDateKey(value: Date | string | number = new Date()): string {
  return dayjs(value).format(DATE_KEY_FORMAT);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** 'чт, 11 сентября' */
export function formatLessonDate(dateKey: string): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).format('dd, D MMMM');
}

/** '11 сентября 2026' */
export function formatFullDate(dateKey: string): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).format('D MMMM YYYY');
}

/** 'сентябрь 2026' */
export function formatMonthTitle(dateKey: string): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).format('MMMM YYYY');
}

export function addDays(dateKey: string, days: number): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).add(days, 'day').format(DATE_KEY_FORMAT);
}

/** Понедельник недели, в которую попадает дата: неделя начинается с понедельника. */
export function startOfWeek(dateKey: string): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).isoWeekday(1).format(DATE_KEY_FORMAT);
}

export function isPastDate(dateKey: string): boolean {
  return dayjs(dateKey, DATE_KEY_FORMAT).isBefore(dayjs(todayKey(), DATE_KEY_FORMAT), 'day');
}
