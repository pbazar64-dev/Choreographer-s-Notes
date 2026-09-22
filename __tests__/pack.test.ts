import type { Material } from '@/db/schema';
import {
  PACK_FORMAT_VERSION,
  buildPack,
  buildPackFileName,
  findDuplicate,
  packEntryFor,
  packFileName,
  packSize,
  parsePack,
  type PackEntry,
} from '@/features/materials/pack';

function material(values: Partial<Material> = {}): Material {
  return {
    id: 1,
    type: 'video_file',
    title: 'Разминка у станка',
    description: '',
    localPath: 'materials/abc123.mp4',
    url: null,
    thumbnailPath: 'thumbnails/abc123.jpg',
    durationSec: 180,
    fileSizeBytes: 5_000_000,
    createdAt: 0,
    ...values,
  };
}

function entry(values: Partial<PackEntry> = {}): PackEntry {
  return {
    type: 'video_file',
    title: 'Разминка у станка',
    description: '',
    url: null,
    file: 'files/abc123.mp4',
    thumbnail: 'files/abc123.jpg',
    durationSec: 180,
    fileSizeBytes: 5_000_000,
    tags: [],
    ...values,
  };
}

describe('имя файла набора', () => {
  it('содержит количество материалов и дату', () => {
    expect(buildPackFileName(new Date(2026, 8, 22), 5)).toBe(
      'choreonotes-materials-5-2026-09-22.zip',
    );
  });
});

describe('сборка записи набора', () => {
  it('переносит описание, теги и кладёт файлы в files/', () => {
    const result = packEntryFor(material({ description: 'Для младших' }), ['Разминка', 'Станок']);

    expect(result).toMatchObject({
      type: 'video_file',
      title: 'Разминка у станка',
      description: 'Для младших',
      file: 'files/abc123.mp4',
      thumbnail: 'files/abc123.jpg',
      durationSec: 180,
      tags: ['Разминка', 'Станок'],
    });
  });

  it('не кладёт картинку в набор дважды: превью и есть сам файл', () => {
    const image = material({
      type: 'image',
      localPath: 'materials/pic.jpg',
      thumbnailPath: 'materials/pic.jpg',
    });

    const result = packEntryFor(image, []);
    expect(result.file).toBe('files/pic.jpg');
    expect(result.thumbnail).toBe('files/pic.jpg');
  });

  it('у материала-ссылки файла нет', () => {
    const link = material({
      type: 'audio_link',
      localPath: null,
      thumbnailPath: null,
      url: 'https://music.yandex.ru/album/1/track/2',
    });

    const result = packEntryFor(link, ['Танго']);
    expect(result.file).toBeNull();
    expect(result.url).toBe('https://music.yandex.ru/album/1/track/2');
  });

  it('имя файла берётся из относительного пути', () => {
    expect(packFileName('materials/abc123.mp4')).toBe('abc123.mp4');
    expect(packFileName('abc123.mp4')).toBe('abc123.mp4');
  });
});

describe('разбор набора', () => {
  const valid = JSON.stringify(buildPack([entry()], new Date(2026, 8, 22)));

  it('принимает свой набор', () => {
    const result = parsePack(valid);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.materials).toHaveLength(1);
    expect(result.pack.formatVersion).toBe(PACK_FORMAT_VERSION);
  });

  it('отвергает мусор и чужие архивы', () => {
    expect(parsePack('не json')).toMatchObject({ ok: false });
    expect(parsePack('{"app":"other"}')).toMatchObject({
      ok: false,
      reason: 'Этот архив создан другим приложением.',
    });
  });

  it('узнаёт резервную копию и подсказывает, куда её нести', () => {
    const backup = JSON.stringify({
      app: 'choreonotes',
      formatVersion: 1,
      databaseName: 'choreonotes.db',
    });

    const result = parsePack(backup);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('резервная копия');
  });

  it('не принимает набор из более новой версии приложения', () => {
    const future = JSON.stringify({
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: PACK_FORMAT_VERSION + 1,
      materials: [entry()],
    });

    expect(parsePack(future)).toMatchObject({ ok: false });
  });

  it('выбрасывает записи с путём наружу из архива', () => {
    const malicious = JSON.stringify({
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: 1,
      materials: [
        entry({ file: '../../choreonotes.db' }),
        entry({ file: '/etc/passwd' }),
        entry({ file: 'files/ok.mp4' }),
      ],
    });

    const result = parsePack(malicious);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Две записи остались без файла и без ссылки — открывать их нечем.
    expect(result.pack.materials).toHaveLength(1);
    expect(result.pack.materials[0]?.file).toBe('files/ok.mp4');
  });

  it('выбрасывает записи с неизвестным типом', () => {
    const mixed = JSON.stringify({
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: 1,
      materials: [entry(), { ...entry(), type: 'pdf' }],
    });

    const result = parsePack(mixed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.materials).toHaveLength(1);
  });

  it('подставляет название, когда его нет', () => {
    const untitled = JSON.stringify({
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: 1,
      materials: [entry({ title: '   ' })],
    });

    const result = parsePack(untitled);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.materials[0]?.title).toBe('Без названия');
  });

  it('пустой набор — это ошибка, а не пустой импорт', () => {
    const empty = JSON.stringify({
      app: 'choreonotes',
      kind: 'materials-pack',
      formatVersion: 1,
      materials: [],
    });

    expect(parsePack(empty)).toMatchObject({ ok: false });
  });
});

describe('повторное добавление', () => {
  it('узнаёт материал по названию и размеру', () => {
    const existing = [material()];

    expect(findDuplicate(entry(), existing)).not.toBeNull();
    expect(findDuplicate(entry({ fileSizeBytes: 7_000_000 }), existing)).toBeNull();
    expect(findDuplicate(entry({ title: 'Другое видео' }), existing)).toBeNull();
  });

  it('не обращает внимания на регистр и ё', () => {
    const existing = [material({ title: 'Берёзка' })];
    expect(findDuplicate(entry({ title: 'БЕРЕЗКА' }), existing)).not.toBeNull();
  });

  it('ссылки сравнивает по адресу, а не по названию', () => {
    const url = 'https://music.yandex.ru/track/1';
    const existing = [material({ type: 'audio_link', localPath: null, url, fileSizeBytes: null })];

    const same = entry({ type: 'audio_link', file: null, url, title: 'Совсем другое название' });
    expect(findDuplicate(same, existing)).not.toBeNull();

    const other = entry({ type: 'audio_link', file: null, url: 'https://music.yandex.ru/track/2' });
    expect(findDuplicate(other, existing)).toBeNull();
  });

  it('без размера файла дубликат не угадывает — лучше добавить дважды, чем потерять', () => {
    const existing = [material({ fileSizeBytes: null })];
    expect(findDuplicate(entry({ fileSizeBytes: null }), existing)).toBeNull();
  });
});

describe('размер набора', () => {
  it('складывает файлы и не спотыкается о ссылки', () => {
    expect(packSize([entry(), entry({ fileSizeBytes: null }), entry({ fileSizeBytes: 1000 })])).toBe(
      5_001_000,
    );
    expect(packSize([])).toBe(0);
  });
});
