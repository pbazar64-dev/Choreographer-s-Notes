/**
 * Чистые преобразования путей. Нативные модули отдают их в разных видах:
 * expo-sqlite — обычным путём файловой системы (`/data/user/0/.../SQLite`),
 * expo-file-system — URI со схемой (`file:///data/user/0/.../files/`).
 * Смешивать их нельзя: `Directory`/`File` требуют абсолютный URI и падают
 * с `IllegalArgumentException: URI is not absolute` на пути без схемы.
 */

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** '/data/user/0/app/SQLite' → 'file:///data/user/0/app/SQLite'. */
export function toFileUri(rawPath: unknown): string | null {
  if (typeof rawPath !== 'string') return null;

  const path = rawPath.trim();
  if (!path) return null;

  // Уже с схемой (file://, content://) — трогать нечего.
  if (SCHEME.test(path)) return stripTrailingSlashes(path);

  // Относительный путь разрешать не от чего — лучше честно вернуть null.
  if (!path.startsWith('/')) return null;

  // encodeURI оставляет '#' и '?', а в пути они оборвали бы URI.
  const encoded = encodeURI(stripTrailingSlashes(path)).replace(/#/g, '%23').replace(/\?/g, '%3F');

  return `file://${encoded}`;
}

/** 'file:///data/.../SQLite/' → '/data/.../SQLite' (react-native-zip-archive ждёт путь). */
export function toFilePath(uri: string): string {
  return decodeURIComponent(stripTrailingSlashes(uri.replace(/^file:\/\//, '')));
}

/** Приклеивает имя файла к URI папки, не плодя лишних слэшей. */
export function joinUri(directoryUri: string, name: string): string {
  return `${stripTrailingSlashes(directoryUri)}/${name.replace(/^\/+/, '')}`;
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}
