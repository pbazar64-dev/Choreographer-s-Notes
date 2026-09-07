import { useMemo } from 'react';
import { View } from 'react-native';

import { useDatabase } from '@/db/useDatabase';
import { getUpcomingLesson } from '@/db/repositories/lessons.repo';
import { formatLessonDate, todayKey } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, EmptyState, Screen, Text } from '@/ui';

export default function CalendarScreen() {
  const db = useDatabase();
  const theme = useTheme();
  const upcoming = useMemo(() => getUpcomingLesson(db, todayKey()), [db]);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <Text variant="caption" tone="muted">
          Ближайший урок
        </Text>

        {upcoming ? (
          <Card accentColor={upcoming.groupColorHex}>
            <Text variant="caption" tone="muted">
              {upcoming.groupName}
            </Text>
            <Text variant="subtitle">{upcoming.title}</Text>
            <Text tone="muted">
              {formatLessonDate(upcoming.date)}
              {upcoming.startTime ? `, ${upcoming.startTime}` : ''} · {upcoming.plannedMinutes} мин
            </Text>
          </Card>
        ) : (
          <Card>
            <Text tone="muted">Ближайших уроков нет</Text>
          </Card>
        )}

        <EmptyState
          title="Календарь появится на этапе Э5"
          description="Сейчас готов каркас приложения: база данных, миграции и тестовые данные."
        />
      </View>
    </Screen>
  );
}
