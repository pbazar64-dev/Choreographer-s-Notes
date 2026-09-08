import {
  adjustMinutes,
  createTimer,
  elapsedMs,
  isExpired,
  isRunning,
  lessonElapsedSec,
  pause,
  remainingMs,
  start,
  toggle,
} from '@/features/session/timer';

const T0 = 1_800_000_000_000;
const MINUTE = 60_000;

describe('таймер блока', () => {
  it('стартует с полного планового времени', () => {
    const timer = createTimer(15);

    expect(remainingMs(timer, T0)).toBe(15 * MINUTE);
    expect(isRunning(timer)).toBe(false);
  });

  it('считает время по системным часам, а не по тикам', () => {
    const running = start(createTimer(10), T0);

    // Приложение было свёрнуто 7 минут — таймер всё это время шёл.
    expect(remainingMs(running, T0 + 7 * MINUTE)).toBe(3 * MINUTE);
    expect(elapsedMs(running, T0 + 7 * MINUTE)).toBe(7 * MINUTE);
  });

  it('на паузе время не идёт, после снятия продолжает', () => {
    const running = start(createTimer(10), T0);
    const paused = pause(running, T0 + 2 * MINUTE);

    expect(remainingMs(paused, T0 + 30 * MINUTE)).toBe(8 * MINUTE);

    const resumed = start(paused, T0 + 30 * MINUTE);
    expect(remainingMs(resumed, T0 + 31 * MINUTE)).toBe(7 * MINUTE);
  });

  it('уходит в минус: урок не останавливается по звонку', () => {
    const running = start(createTimer(5), T0);
    const later = T0 + 8 * MINUTE;

    expect(isExpired(running, later)).toBe(true);
    expect(remainingMs(running, later)).toBe(-3 * MINUTE);
  });

  it('«+1 мин» и «−1 мин» меняют отведённое время, не трогая пройденное', () => {
    const running = start(createTimer(10), T0);
    const now = T0 + 4 * MINUTE;

    const extended = adjustMinutes(running, 1);
    expect(remainingMs(extended, now)).toBe(7 * MINUTE);
    expect(elapsedMs(extended, now)).toBe(4 * MINUTE);

    const shortened = adjustMinutes(extended, -1);
    expect(remainingMs(shortened, now)).toBe(6 * MINUTE);
  });

  it('не даёт увести отведённое время в минус кнопкой «−1 мин»', () => {
    const timer = adjustMinutes(adjustMinutes(createTimer(1), -1), -1);
    expect(timer.allocatedMs).toBe(0);
  });

  it('повторный старт и повторная пауза ничего не ломают', () => {
    const running = start(start(createTimer(10), T0), T0 + MINUTE);
    expect(remainingMs(running, T0 + 2 * MINUTE)).toBe(8 * MINUTE);

    const paused = pause(pause(running, T0 + 2 * MINUTE), T0 + 5 * MINUTE);
    expect(remainingMs(paused, T0 + 10 * MINUTE)).toBe(8 * MINUTE);
  });

  it('переключается кнопкой', () => {
    const started = toggle(createTimer(10), T0);
    expect(isRunning(started)).toBe(true);

    const stopped = toggle(started, T0 + MINUTE);
    expect(isRunning(stopped)).toBe(false);
    expect(stopped.elapsedBeforePauseMs).toBe(MINUTE);
  });
});

describe('общее время урока', () => {
  it('считается от запуска режима по системным часам', () => {
    expect(lessonElapsedSec(T0, T0 + 90_000)).toBe(90);
    expect(lessonElapsedSec(T0, T0 - 5000)).toBe(0);
  });
});
