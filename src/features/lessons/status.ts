/**
 * Статус конспекта вычисляется, а не хранится: урок считается запланированным,
 * когда время блоков в точности покрывает длительность урока — 60 минут из 60.
 * Никаких «проведён» и «черновик»: конспект либо расписан целиком, либо нет.
 */
export function isLessonPlanned(blocksMinutes: number, lessonMinutes: number): boolean {
  return lessonMinutes > 0 && blocksMinutes === lessonMinutes;
}

export function lessonPlanLabel(blocksMinutes: number, lessonMinutes: number): string {
  return isLessonPlanned(blocksMinutes, lessonMinutes) ? 'Запланирован' : 'Не запланирован';
}
