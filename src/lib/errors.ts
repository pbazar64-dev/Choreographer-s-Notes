/**
 * У нативных ошибок первая строка человеческая, а дальше идёт стек Java —
 * в диалоге он только пугает и всё равно не помещается на экран.
 */
export function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split('\n')[0]?.replace(/^Error:\s*/, '').trim();

  return firstLine || 'Неизвестная ошибка.';
}
