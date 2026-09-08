import {
  BACKUP_FORMAT_VERSION,
  BACKUP_REMINDER_DAYS,
  buildBackupFileName,
  daysSinceBackup,
  needsBackupReminder,
  parseManifest,
} from '@/features/backup/manifest';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 8, 12, 0, 0);

describe('имя файла копии', () => {
  it('содержит дату', () => {
    expect(buildBackupFileName(new Date(2026, 8, 8))).toBe('choreonotes-backup-2026-09-08.zip');
    expect(buildBackupFileName(new Date(2026, 0, 1))).toBe('choreonotes-backup-2026-01-01.zip');
  });
});

describe('проверка манифеста копии', () => {
  const valid = JSON.stringify({
    app: 'choreonotes',
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: '2026-09-08T10:00:00.000Z',
    databaseName: 'choreonotes.db',
  });

  it('принимает свой архив', () => {
    const result = parseManifest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.databaseName).toBe('choreonotes.db');
    }
  });

  it('отвергает чужой архив', () => {
    const result = parseManifest(JSON.stringify({ app: 'notes', formatVersion: 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('другим приложением');
  });

  it('отвергает битый JSON', () => {
    expect(parseManifest('{не json').ok).toBe(false);
  });

  it('отвергает копию из более новой версии приложения', () => {
    const result = parseManifest(
      JSON.stringify({
        app: 'choreonotes',
        formatVersion: BACKUP_FORMAT_VERSION + 1,
        databaseName: 'choreonotes.db',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('более новой версией');
  });

  it('отвергает архив без имени базы', () => {
    const result = parseManifest(
      JSON.stringify({ app: 'choreonotes', formatVersion: BACKUP_FORMAT_VERSION }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('напоминание о резервной копии', () => {
  it('молчит, пока копия свежая', () => {
    expect(needsBackupReminder(NOW - 3 * DAY, NOW)).toBe(false);
    expect(daysSinceBackup(NOW - 3 * DAY, NOW)).toBe(3);
  });

  it('срабатывает через две недели', () => {
    expect(needsBackupReminder(NOW - (BACKUP_REMINDER_DAYS - 1) * DAY, NOW)).toBe(false);
    expect(needsBackupReminder(NOW - BACKUP_REMINDER_DAYS * DAY, NOW)).toBe(true);
  });

  it('срабатывает, если копии не было ни разу', () => {
    expect(needsBackupReminder(null, NOW)).toBe(true);
    expect(daysSinceBackup(null, NOW)).toBeNull();
  });
});
