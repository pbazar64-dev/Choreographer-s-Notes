import { useRouter } from 'expo-router';

import { getNumberSetting, SETTINGS_KEYS } from '@/db/repositories/settings.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Text } from '@/ui';

import { BACKUP_REMINDER_DAYS, daysSinceBackup, needsBackupReminder } from '../manifest';

/** Ненавязчивая плашка: последней копии больше двух недель или её вообще нет. */
export function BackupReminder() {
  const router = useRouter();
  const theme = useTheme();

  // Date.now() вызывается внутри запроса, а не в теле компонента:
  // рендер должен оставаться чистой функцией от данных.
  const reminder = useDbQuery((db) => {
    const lastBackupAt = getNumberSetting(db, SETTINGS_KEYS.lastBackupAt);
    const now = Date.now();

    return {
      needed: needsBackupReminder(lastBackupAt, now),
      days: daysSinceBackup(lastBackupAt, now),
    };
  }, []);

  if (!reminder.needed) return null;

  const days = reminder.days;

  return (
    <Card onPress={() => router.push('/settings')} style={{ borderColor: theme.colors.warning }}>
      <Text variant="label">Давно не было резервной копии</Text>
      <Text variant="caption" tone="muted">
        {days === null
          ? 'Копию ещё ни разу не делали. Удаление приложения сотрёт все конспекты и видео.'
          : `Последняя копия ${days} дн. назад — больше ${BACKUP_REMINDER_DAYS} дней. Нажмите, чтобы сделать новую.`}
      </Text>
    </Card>
  );
}
