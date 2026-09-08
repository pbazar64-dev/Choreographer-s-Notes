import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { GroupCard } from '@/features/groups/components/GroupCard';
import { createLessonForGroup } from '@/features/lessons/createLesson';
import { formatFullDate, todayKey } from '@/lib/date';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text } from '@/ui';

/** Выбор группы для нового конспекта на выбранную в календаре дату. */
export default function NewLessonScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? todayKey();

  const groups = useDbQuery((database) => listGroups(database), []);

  function handleSelectGroup(groupId: number) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    const lesson = createLessonForGroup(db, group, date);
    bumpDbRevision();
    router.replace(`/lesson/${lesson.id}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Новый конспект' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}
      >
        <Text tone="muted">Урок на {formatFullDate(date)}. Выберите группу:</Text>

        {groups.length === 0 ? (
          <EmptyState
            title="Сначала нужна группа"
            description="Конспект всегда принадлежит группе: «Дети 8–10», «Взрослые 16+»."
            actionTitle="Создать группу"
            onAction={() => router.replace('/group/edit')}
          />
        ) : (
          groups.map((group) => (
            <GroupCard key={group.id} group={group} onPress={() => handleSelectGroup(group.id)} />
          ))
        )}

        <View style={{ paddingTop: theme.spacing.sm }}>
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
