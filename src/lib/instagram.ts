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

/** Высота шапки автора и подписи внутри встроенной страницы Instagram. */
const EMBED_CHROME_HEIGHT = 108;
const MAX_FRAME_WIDTH = 420;
/** Вертикальное видео Instagram: 9 к 16. */
const VERTICAL_RATIO = 16 / 9;

export type FrameSize = { width: number; height: number };

/**
 * Размер окна под вертикальное видео. Рамка сужается, чтобы не было чёрных
 * полей по бокам, и не вылезает за экран по высоте.
 */
export function instagramFrameSize(availableWidth: number, availableHeight: number): FrameSize {
  const heightBudget = Math.max(240, availableHeight * 0.75) - EMBED_CHROME_HEIGHT;
  const widthByHeight = heightBudget / VERTICAL_RATIO;
  const width = Math.max(200, Math.min(availableWidth, MAX_FRAME_WIDTH, widthByHeight));

  return {
    width: Math.round(width),
    height: Math.round(width * VERTICAL_RATIO + EMBED_CHROME_HEIGHT),
  };
}
