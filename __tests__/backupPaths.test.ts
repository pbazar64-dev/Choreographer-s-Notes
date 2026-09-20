import { joinUri, toFilePath, toFileUri } from '@/features/backup/paths';

describe('нормализация пути к файлу базы', () => {
  it('добавляет схему file:// к пути файловой системы', () => {
    expect(toFileUri('/data/user/0/com.app/files/SQLite')).toBe(
      'file:///data/user/0/com.app/files/SQLite',
    );
  });

  it('убирает завершающие слэши', () => {
    expect(toFileUri('/data/files/SQLite//')).toBe('file:///data/files/SQLite');
    expect(toFileUri('file:///data/files/SQLite/')).toBe('file:///data/files/SQLite');
  });

  it('не трогает путь, у которого схема уже есть', () => {
    expect(toFileUri('file:///data/files/SQLite')).toBe('file:///data/files/SQLite');
    expect(toFileUri('content://com.android.providers/1')).toBe(
      'content://com.android.providers/1',
    );
  });

  it('экранирует символы, которые оборвали бы URI', () => {
    expect(toFileUri('/data/my files/база #1')).toBe('file:///data/my%20files/%D0%B1%D0%B0%D0%B7%D0%B0%20%231');
    expect(toFileUri('/data/a?b')).toBe('file:///data/a%3Fb');
  });

  it('возвращает null, когда пути нет или он относительный', () => {
    expect(toFileUri(null)).toBeNull();
    expect(toFileUri(undefined)).toBeNull();
    expect(toFileUri('')).toBeNull();
    expect(toFileUri('   ')).toBeNull();
    expect(toFileUri(42)).toBeNull();
    expect(toFileUri('SQLite/choreonotes.db')).toBeNull();
  });
});

describe('обратное преобразование в путь', () => {
  it('снимает схему и раскодирует символы', () => {
    expect(toFilePath('file:///data/files/SQLite')).toBe('/data/files/SQLite');
    expect(toFilePath('file:///data/my%20files/')).toBe('/data/my files');
  });

  it('переживает путь без схемы', () => {
    expect(toFilePath('/data/files/SQLite')).toBe('/data/files/SQLite');
  });

  it('обратим с toFileUri', () => {
    const path = '/data/user/0/com.app/files/SQLite';
    expect(toFilePath(toFileUri(path) ?? '')).toBe(path);
  });
});

describe('склейка URI папки и имени файла', () => {
  it('не плодит лишних слэшей', () => {
    expect(joinUri('file:///data/SQLite', 'app.db')).toBe('file:///data/SQLite/app.db');
    expect(joinUri('file:///data/SQLite/', 'app.db')).toBe('file:///data/SQLite/app.db');
    expect(joinUri('file:///data/SQLite', '/app.db')).toBe('file:///data/SQLite/app.db');
  });
});
