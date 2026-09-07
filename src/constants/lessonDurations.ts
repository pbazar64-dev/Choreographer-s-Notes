/** Пресеты длительности урока: только эти варианты доступны в интерфейсе. */
export const LESSON_DURATIONS = [30, 45, 60, 90, 120] as const;

export type LessonDuration = (typeof LESSON_DURATIONS)[number];

export const DEFAULT_LESSON_MINUTES: LessonDuration = 60;

export function lessonDurationLabel(minutes: number): string {
  switch (minutes) {
    case 30:
      return '30 мин';
    case 45:
      return '45 мин';
    case 60:
      return '1 час';
    case 90:
      return '1,5 часа';
    case 120:
      return '2 часа';
    default:
      return `${minutes} мин`;
  }
}
