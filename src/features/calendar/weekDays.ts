import { DATE_KEY_FORMAT, dayjs, startOfWeek, toDateKey } from '@/lib/date';

export type WeekDay = {
  dateKey: string;
  /** «пн», «вт», … */
  weekdayShort: string;
  dayOfMonth: number;
  isToday: boolean;
};

/** Семь дней недели, в которую попадает дата. Неделя начинается с понедельника. */
export function getWeekDays(dateKey: string, todayKeyValue = toDateKey()): WeekDay[] {
  const monday = dayjs(startOfWeek(dateKey), DATE_KEY_FORMAT);

  return Array.from({ length: 7 }, (_, index) => {
    const day = monday.add(index, 'day');
    const key = day.format(DATE_KEY_FORMAT);

    return {
      dateKey: key,
      weekdayShort: day.format('dd'),
      dayOfMonth: day.date(),
      isToday: key === todayKeyValue,
    };
  });
}

export function shiftWeek(dateKey: string, weeks: number): string {
  return dayjs(dateKey, DATE_KEY_FORMAT).add(weeks, 'week').format(DATE_KEY_FORMAT);
}
