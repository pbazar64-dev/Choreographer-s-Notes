import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import { useDatabase } from '@/db/useDatabase';
import { formatFullDate } from '@/lib/date';
import { lessonDurationLabel } from '@/constants/lessonDurations';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, EmptyState, Screen, Text } from '@/ui';

export default function GroupsScreen() {
  const db = useDatabase();
  const theme = useTheme();
  const groups = useMemo(() => listGroups(db), [db]);

  return (
    <Screen>
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}
        ListEmptyComponent={
          <EmptyState title="Групп пока нет" description="Создание групп появится на этапе Э1." />
        }
        ListFooterComponent={
          groups.length > 0 ? (
            <View style={{ paddingTop: theme.spacing.md }}>
              <Text variant="caption" tone="muted">
                Редактирование групп появится на этапе Э1.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card accentColor={item.colorHex}>
            <Text variant="subtitle">{item.name}</Text>
            {item.description ? <Text tone="muted">{item.description}</Text> : null}
            <Text variant="caption" tone="muted">
              Конспектов: {item.lessonsCount} · Урок по умолчанию:{' '}
              {lessonDurationLabel(item.defaultLessonMinutes)}
              {item.lastLessonDate ? ` · Последний: ${formatFullDate(item.lastLessonDate)}` : ''}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
