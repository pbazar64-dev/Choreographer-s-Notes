/** Чистая часть работы с резервной копией: имя файла и разбор manifest.json. */

export const BACKUP_FORMAT_VERSION = 1;

export type BackupManifest = {
  app: 'choreonotes';
  formatVersion: number;
  createdAt: string;
  databaseName: string;
};

export function buildBackupFileName(date: Date): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return `choreonotes-backup-${stamp}.zip`;
}

export type ManifestCheck = { ok: true; manifest: BackupManifest } | { ok: false; reason: string };

export function parseManifest(raw: string): ManifestCheck {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Файл manifest.json повреждён.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'Файл manifest.json повреждён.' };
  }

  const candidate = parsed as Partial<BackupManifest>;

  if (candidate.app !== 'choreonotes') {
    return { ok: false, reason: 'Этот архив создан другим приложением.' };
  }

  if (typeof candidate.formatVersion !== 'number') {
    return { ok: false, reason: 'В архиве не указана версия формата копии.' };
  }

  if (candidate.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      reason: 'Копия сделана более новой версией приложения. Обновите приложение и повторите.',
    };
  }

  if (typeof candidate.databaseName !== 'string' || !candidate.databaseName) {
    return { ok: false, reason: 'В архиве не указано имя файла базы.' };
  }

  return {
    ok: true,
    manifest: {
      app: 'choreonotes',
      formatVersion: candidate.formatVersion,
      createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
      databaseName: candidate.databaseName,
    },
  };
}

/** Пора ли напомнить о бэкапе: последний экспорт старше 14 дней (п. 4.8 ТЗ). */
export const BACKUP_REMINDER_DAYS = 14;

export function daysSinceBackup(lastBackupAt: number | null, now: number): number | null {
  if (!lastBackupAt) return null;
  return Math.floor((now - lastBackupAt) / (24 * 60 * 60 * 1000));
}

export function needsBackupReminder(lastBackupAt: number | null, now: number): boolean {
  const days = daysSinceBackup(lastBackupAt, now);
  return days === null || days >= BACKUP_REMINDER_DAYS;
}
