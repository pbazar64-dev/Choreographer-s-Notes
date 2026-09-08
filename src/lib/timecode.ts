/** Таймкод материала: «1:30» — с какой секунды открывать видео. */

export function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.trunc(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Разбор введённого таймкода: «90» → 90 сек, «1:30» → 90 сек, «1:02:05» → 3725 сек.
 * Возвращает null, если строка пустая или непонятная.
 */
export function parseTimecode(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length > 3) return null;

  const numbers = parts.map((part) => Number(part.trim()));
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return null;

  if (numbers.length === 1) return Math.round(numbers[0] as number);

  const seconds = numbers[numbers.length - 1] as number;
  const minutes = numbers[numbers.length - 2] as number;
  const hours = numbers.length === 3 ? (numbers[0] as number) : 0;

  if (seconds >= 60 || (numbers.length === 3 && minutes >= 60)) return null;

  return Math.round(hours * 3600 + minutes * 60 + seconds);
}
