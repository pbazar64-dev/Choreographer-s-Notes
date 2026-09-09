import {
  instagramEmbedUrl,
  instagramFrameSize,
  isInstagramUrl,
  parseInstagramUrl,
} from '@/lib/instagram';

describe('ссылки Instagram', () => {
  it('узнаёт ссылки Instagram', () => {
    expect(isInstagramUrl('https://www.instagram.com/p/ABC123/')).toBe(true);
    expect(isInstagramUrl('https://instagram.com/reel/ABC123')).toBe(true);
    expect(isInstagramUrl('https://youtu.be/abc')).toBe(false);
    expect(isInstagramUrl('https://example.com/instagram')).toBe(false);
  });

  it('разбирает посты, рилсы и IGTV', () => {
    expect(parseInstagramUrl('https://www.instagram.com/p/ABC-123_x/')).toEqual({
      kind: 'p',
      code: 'ABC-123_x',
    });
    expect(parseInstagramUrl('https://www.instagram.com/reel/XYZ789/')).toEqual({
      kind: 'reel',
      code: 'XYZ789',
    });
    expect(parseInstagramUrl('https://www.instagram.com/tv/QWE456/')).toEqual({
      kind: 'tv',
      code: 'QWE456',
    });
  });

  it('понимает ссылку с именем автора и параметрами', () => {
    expect(
      parseInstagramUrl('https://www.instagram.com/dance_studio/reel/ABC123/?igsh=xyz&utm=1'),
    ).toEqual({ kind: 'reel', code: 'ABC123' });
    expect(parseInstagramUrl('https://www.instagram.com/reels/ABC123/')).toEqual({
      kind: 'reel',
      code: 'ABC123',
    });
  });

  it('не встраивает то, что встроить нельзя', () => {
    expect(instagramEmbedUrl('https://www.instagram.com/dance_studio/')).toBeNull();
    expect(instagramEmbedUrl('https://vk.com/video-1_2')).toBeNull();
    expect(instagramEmbedUrl('')).toBeNull();
  });

  it('строит адрес страницы для встраивания', () => {
    expect(instagramEmbedUrl('https://www.instagram.com/p/ABC123/')).toBe(
      'https://www.instagram.com/p/ABC123/embed/captioned/',
    );
    expect(instagramEmbedUrl('https://www.instagram.com/reel/XYZ789/?igsh=1')).toBe(
      'https://www.instagram.com/reel/XYZ789/embed/captioned/',
    );
  });
});

describe('размер вертикального окна Instagram', () => {
  it('на телефоне ужимается так, чтобы влезть по высоте', () => {
    const frame = instagramFrameSize(360, 800);

    expect(frame.width).toBeLessThanOrEqual(360);
    expect(frame.height).toBeLessThanOrEqual(800);
    expect(frame.height).toBeGreaterThan(frame.width);
  });

  it('на планшете не растягивается на всю ширину', () => {
    const frame = instagramFrameSize(1000, 1400);
    expect(frame.width).toBe(420);
  });

  it('в альбомной ориентации ужимается по высоте', () => {
    const frame = instagramFrameSize(1200, 600);
    expect(frame.height).toBeLessThanOrEqual(600);
    expect(frame.width).toBeLessThan(420);
  });

  it('окно всегда вертикальное', () => {
    for (const [w, h] of [
      [360, 800],
      [1000, 1400],
      [1200, 600],
      [200, 300],
    ]) {
      const frame = instagramFrameSize(w as number, h as number);
      expect(frame.height).toBeGreaterThan(frame.width);
    }
  });
});
