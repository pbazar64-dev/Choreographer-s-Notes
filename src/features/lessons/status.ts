import type { LessonStatus } from '@/db/schema';

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  draft: 'Черновик',
  planned: 'Запланирован',
  done: 'Проведён',
};

export function lessonStatusLabel(status: LessonStatus): string {
  return LESSON_STATUS_LABELS[status];
}
