/**
 * Поиск сравнивается в JavaScript, а не в SQL: SQLite-функция lower()
 * работает только с латиницей, и по русскому тексту поиск молча ничего не находит.
 */
export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

export function matchesSearch(haystack: string, normalizedTerm: string): boolean {
  if (!normalizedTerm) return true;
  return normalizeSearch(haystack).includes(normalizedTerm);
}
