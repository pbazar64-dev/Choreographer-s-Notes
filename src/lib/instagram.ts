/**
 * Разбор ссылок Instagram для встроенного окна.
 *
 * Instagram не отдаёт сторонним приложениям прямые ссылки на видеофайл, но
 * у постов есть страница для встраивания. Мы показываем именно её — поэтому
 * такое видео требует интернета, не поддерживает наш таймкод и может
 * перестать открываться, если Instagram поменяет формат у себя.
 */

export type InstagramPost = {
  /** 'p' — пост, 'reel' — рилс, 'tv' — IGTV */
  kind: 'p' | 'reel' | 'tv';
  code: string;
};

const POST_PATTERN = /instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

export function isInstagramUrl(url: string): boolean {
  return /(^|\/\/|\.)instagram\.com\//i.test(url.trim());
}

export function parseInstagramUrl(url: string): InstagramPost | null {
  const match = POST_PATTERN.exec(url.trim());
  if (!match) return null;

  const rawKind = match[1]?.toLowerCase();
  const code = match[2];
  if (!rawKind || !code) return null;

  const kind = rawKind === 'reels' ? 'reel' : (rawKind as InstagramPost['kind']);

  return { kind, code };
}

/** Адрес страницы для встраивания. null — ссылку встроить нельзя, только открыть в приложении. */
export function instagramEmbedUrl(url: string): string | null {
  const post = parseInstagramUrl(url);
  if (!post) return null;

  return `https://www.instagram.com/${post.kind}/${post.code}/embed/captioned/`;
}
