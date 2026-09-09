import { buildTitleFromMeta, extractMetaTags } from '@/lib/linkMetadata';

describe('разбор метатегов страницы', () => {
  it('собирает property и name', () => {
    const meta = extractMetaTags(`
      <meta property="og:title" content="Название"/>
      <meta name="twitter:title" content="Другое"/>
    `);

    expect(meta['og:title']).toBe('Название');
    expect(meta['twitter:title']).toBe('Другое');
  });

  it('раскодирует html-символы', () => {
    const meta = extractMetaTags('<meta property="og:title" content="Р&amp;Б &laquo;хит&raquo;">');
    expect(meta['og:title']).toBe('Р&Б «хит»');
  });
});

describe('название материала из ссылки', () => {
  it('склеивает исполнителя и трек', () => {
    const html = `
      <meta property="og:title" content="Утро"/>
      <meta property="music:musician_name" content="Хмури"/>
    `;

    expect(buildTitleFromMeta(html)).toBe('Хмури — Утро');
  });

  it('не дублирует исполнителя, если он уже в заголовке', () => {
    const html = `
      <meta property="og:title" content="Хмури — Утро"/>
      <meta property="music:musician_name" content="Хмури"/>
    `;

    expect(buildTitleFromMeta(html)).toBe('Хмури — Утро');
  });

  it('берёт заголовок как есть, когда исполнителя отдельно нет', () => {
    expect(buildTitleFromMeta('<meta property="og:title" content="Медленный трек"/>')).toBe(
      'Медленный трек',
    );
  });

  it('убирает хвосты вроде «слушать онлайн» и названия сервиса', () => {
    expect(buildTitleFromMeta('<title>Утро — Хмури: слушать онлайн на Яндекс Музыке</title>')).toBe(
      'Утро — Хмури',
    );
    expect(buildTitleFromMeta('<meta property="og:title" content="Ролик — Яндекс Музыка"/>')).toBe(
      'Ролик',
    );
  });

  it('падает мягко, когда брать нечего', () => {
    expect(buildTitleFromMeta('<html><body>ничего</body></html>')).toBeNull();
    expect(buildTitleFromMeta('')).toBeNull();
  });

  it('предпочитает og:title заголовку вкладки', () => {
    const html = `
      <title>Служебный заголовок</title>
      <meta property="og:title" content="Настоящее название"/>
    `;

    expect(buildTitleFromMeta(html)).toBe('Настоящее название');
  });
});
