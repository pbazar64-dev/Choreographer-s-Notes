import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';

import {
  adjustMinutes,
  createTimer,
  isExpired,
  isRunning,
  remainingMs,
  toggle,
  type BlockTimer,
} from './timer';

/**
 * Таймер текущего блока. Тик раз в секунду нужен только чтобы перерисовать
 * экран: само время считается от Date.now(), поэтому свёрнутое приложение
 * (где таймеры JS тормозятся) не сбивает отсчёт.
 */
export function useSessionTimer(blockId: number | null, plannedMinutes: number) {
  const [timer, setTimer] = useState<BlockTimer>(() => createTimer(plannedMinutes));
  const [now, setNow] = useState(() => Date.now());
  const [timerBlockId, setTimerBlockId] = useState(blockId);
  const vibratedRef = useRef(false);

  // Переход на другой блок — новый таймер. Сравниваем по блоку, а не по времени:
  // два блока подряд по 15 минут иначе продолжили бы один отсчёт.
  if (timerBlockId !== blockId) {
    setTimerBlockId(blockId);
    setTimer(createTimer(plannedMinutes));
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const expired = isExpired(timer, now);

  // Вибрация один раз на переходе через ноль, а не каждую секунду после него.
  useEffect(() => {
    if (expired && isRunning(timer) && !vibratedRef.current) {
      vibratedRef.current = true;
      Vibration.vibrate([0, 400, 200, 400]);
    }
    if (!expired) {
      vibratedRef.current = false;
    }
  }, [expired, timer]);

  return {
    timer,
    now,
    running: isRunning(timer),
    expired,
    remainingSec: Math.round(remainingMs(timer, now) / 1000),
    toggleTimer: useCallback(() => setTimer((current) => toggle(current, Date.now())), []),
    addMinute: useCallback(() => setTimer((current) => adjustMinutes(current, 1)), []),
    subtractMinute: useCallback(() => setTimer((current) => adjustMinutes(current, -1)), []),
  };
}
