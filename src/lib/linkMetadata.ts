/**
 * Название материала из ссылки. Читаем метатеги предпросмотра публичной
 * страницы — те же, из которых мессенджеры делают карточку ссылки.
 * Никакого доступа к самому контенту здесь нет.
 */

const META_PATTERN = /<meta\s+[^>]*>/gi;
const TITLE_PATTERN = /<title[^>]*>([\s\S]*?)<\/title>/i;

/** Хвосты, которые сайты дописывают в заголовок и которые в названии не нужны. */
const NOISE_PATTERNS = [
  /\s*[-—|]\s*(яндекс\s*музыка|yandex\s*music)\s*$/i,
  /\s*[-—|]\s*(вконтакте|vk)\s*$/i,
  /\s*[-—|]\s*instagram\s*$/i,
  /:?\s*слушать онлайн.*$/i,
  /\s*[-—|]\s*смотреть видео онлайн.*$/i,
];

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function clean(value: string | null | undefined): string {
  if (!value) return '';
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function stripNoise(value: string): string {
  let result = value;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/** Собирает метатеги в словарь: и property=, и name= варианты. */
export function extractMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const tag of html.match(META_PATTERN) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];

    if (key && content && !result[key]) {
      result[key] = clean(content);
    }
  }

  return result;
}

/**
 * Название материала по разметке страницы.
 *
 * Формат «Исполнитель — Трек» получается там, где сайт отдаёт исполнителя
 * отдельным полем. Если такого поля нет, берём заголовок страницы как есть:
 * угадывать порядок слов в чужом заголовке — верный способ переставить их наоборот.
 */
export function buildTitleFromMeta(html: string): string | null {
  const meta = extractMetaTags(html);

  const pageTitle = stripNoise(
    clean(meta['og:title'] || meta['twitter:title'] || TITLE_PATTERN.exec(html)?.[1] || ''),
  );

  const artist = clean(
    meta['music:musician_name'] ||
      meta['music:musician'] ||
      meta['og:audio:artist'] ||
      meta['author'] ||
      '',
  );

  if (!pageTitle) return null;

  // Исполнитель уже в заголовке — второй раз не дописываем.
  if (artist && !pageTitle.toLowerCase().includes(artist.toLowerCase())) {
    return `${artist} — ${pageTitle}`;
  }

  return pageTitle;
}

const FETCH_TIMEOUT_MS = 7000;
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

/**
 * Запрашивает страницу и достаёт из неё название. Любая осечка — сети нет,
 * сайт ответил капчей, метатегов не оказалось — возвращает null: название
 * останется за пользователем, и это не ошибка.
 */
export async function fetchLinkTitle(url: string): Promise<string | null> {
  if (!/^https?:\/\/\S+$/i.test(url.trim())) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.trim(), {
      headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const html = await response.text();
    return buildTitleFromMeta(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
