/**
 * Состояние таймера блока.
 *
 * Время НЕ накапливается тиками: хранится метка старта по системным часам,
 * а остаток каждый раз вычисляется от Date.now(). Поэтому таймер продолжает
 * идти, когда приложение свёрнуто, и не врёт после возврата.
 */
export type BlockTimer = {
  /** Отведённое время блока в миллисекундах, с учётом кнопок «−1 мин» и «+1 мин» */
  allocatedMs: number;
  /** Накопленное время до последней паузы */
  elapsedBeforePauseMs: number;
  /** Метка запуска по Date.now(); null — таймер на паузе */
  runningSince: number | null;
};

export function createTimer(plannedMinutes: number): BlockTimer {
  return {
    allocatedMs: Math.max(0, plannedMinutes) * 60_000,
    elapsedBeforePauseMs: 0,
    runningSince: null,
  };
}

export function isRunning(timer: BlockTimer): boolean {
  return timer.runningSince !== null;
}

export function elapsedMs(timer: BlockTimer, now: number): number {
  const running = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince);
  return timer.elapsedBeforePauseMs + running;
}

/** Остаток: отрицательный, когда время блока вышло — урок по звонку не останавливается. */
export function remainingMs(timer: BlockTimer, now: number): number {
  return timer.allocatedMs - elapsedMs(timer, now);
}

export function isExpired(timer: BlockTimer, now: number): boolean {
  return remainingMs(timer, now) <= 0;
}

export function start(timer: BlockTimer, now: number): BlockTimer {
  if (timer.runningSince !== null) return timer;
  return { ...timer, runningSince: now };
}

export function pause(timer: BlockTimer, now: number): BlockTimer {
  if (timer.runningSince === null) return timer;
  return {
    ...timer,
    elapsedBeforePauseMs: elapsedMs(timer, now),
    runningSince: null,
  };
}

export function toggle(timer: BlockTimer, now: number): BlockTimer {
  return isRunning(timer) ? pause(timer, now) : start(timer, now);
}

/** «−1 мин» и «+1 мин» меняют отведённое время, а не уже пройденное. */
export function adjustMinutes(timer: BlockTimer, deltaMinutes: number): BlockTimer {
  return {
    ...timer,
    allocatedMs: Math.max(0, timer.allocatedMs + deltaMinutes * 60_000),
  };
}

/** Время с начала урока: считается от метки запуска режима, тоже по системным часам. */
export function lessonElapsedSec(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
