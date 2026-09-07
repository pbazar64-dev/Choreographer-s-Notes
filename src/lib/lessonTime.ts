/** Расчёт времени урока: критичный для работы элемент конспекта (п. 4.3 ТЗ). */

export type TimedBlock = { plannedMinutes: number };

export function sumBlockMinutes(blocks: readonly TimedBlock[]): number {
  return blocks.reduce((sum, block) => sum + (block.plannedMinutes || 0), 0);
}

export type LessonTimeSummary = {
  /** Сумма планового времени блоков */
  blocksMinutes: number;
  /** Плановая длительность урока */
  lessonMinutes: number;
  /** Разница: положительная — превышение, отрицательная — недобор */
  diffMinutes: number;
  isOver: boolean;
  isExact: boolean;
  /** «Запланировано 62 мин из 60» */
  label: string;
};

export function getLessonTimeSummary(
  blocks: readonly TimedBlock[],
  lessonMinutes: number,
): LessonTimeSummary {
  const blocksMinutes = sumBlockMinutes(blocks);
  const diffMinutes = blocksMinutes - lessonMinutes;

  return {
    blocksMinutes,
    lessonMinutes,
    diffMinutes,
    isOver: diffMinutes > 0,
    isExact: diffMinutes === 0,
    label: `Запланировано ${blocksMinutes} мин из ${lessonMinutes}`,
  };
}

/** «1:05» / «12:30» — для таймера режима урока. */
export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '−' : '';
  const abs = Math.abs(Math.trunc(totalSeconds));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${sign}${hours}:${mm}:${ss}` : `${sign}${mm}:${ss}`;
}
