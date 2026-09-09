/** Перемещение элемента в списке — основа кнопок «выше» и «ниже». */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length || to < 0 || to >= result.length || from === to) {
    return result;
  }

  const [moved] = result.splice(from, 1);
  if (moved === undefined) return [...items];
  result.splice(to, 0, moved);

  return result;
}
