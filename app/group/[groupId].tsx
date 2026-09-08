import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';

import { getGroup, setGroupArchived } from '@/db/repositories/groups.repo';
import { listGroupLessons } from '@/db/repositories/lessons.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useUiPrefs } from '@/stores/uiPrefs';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

export default function GroupLessonsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const newestFirst = useUiPrefs((state) => state.lessonsNewestFirst);
  const setNewestFirst = useUiPrefs((state) => state.setLessonsNewestFirst);
  const [search, setSearch] = useState('');

  const group = useDbQuery((database) => getGroup(database, groupId), [groupId]);
  const lessons = useDbQuery(
    (database) => listGroupLessons(database, groupId, { newestFirst, search }),
    [groupId, newestFirst, search],
  );

  if (!group) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Группа' }} />
        <EmptyState title="Группа не найдена" />
      </Screen>
    );
  }

  function handleToggleArchive() {
    if (!group) return;

    const archiving = !group.isArchived;
    Alert.alert(
      archiving ? 'Убрать группу в архив?' : 'Вернуть группу из архива?',
      archiving
        ? 'Группа скроется из списка, конспекты и материалы останутся на месте.'
        : 'Группа снова появится в списке.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: archiving ? 'В архив' : 'Вернуть',
          onPress: () => {
            setGroupArchived(db, group.id, archiving);
            bumpDbRevision();
          },
        },
      ],
    );
  }

  function handleCreateLesson() {
    if (!group) return;
    router.push(`/lesson/new?groupId=${group.id}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: group.name }} />

      <FlatList
        data={lessons}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xxxl,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xs }}>
            {group.description ? <Text tone="muted">{group.description}</Text> : null}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                title="Редактировать"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push(`/group/edit?groupId=${group.id}`)}
              />
              <Button
                title={group.isArchived ? 'Из архива' : 'В архив'}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleToggleArchive}
              />
            </View>

            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск по конспектам и заметкам"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />

            <SegmentedControl
              value={newestFirst ? 'newest' : 'oldest'}
              onChange={(value) => setNewestFirst(value === 'newest')}
              options={[
                { value: 'newest', label: 'Новые сверху' },
                { value: 'oldest', label: 'Старые сверху' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState
              title="Ничего не найдено"
              description="Поиск идёт по названию и цели урока, а также по заголовкам и заметкам блоков."
            />
          ) : (
            <EmptyState
              title="В группе пока нет конспектов"
              description="Конспект — это план одного урока: блоки, время и материалы."
              actionTitle="Новый конспект"
              onAction={handleCreateLesson}
            />
          )
        }
        renderItem={({ item }) => (
          <LessonCard lesson={item} onPress={() => router.push(`/lesson/${item.id}`)} />
        )}
      />

      {lessons.length > 0 ? (
        <View style={{ paddingBottom: theme.spacing.lg }}>
          <Button title="Новый конспект" onPress={handleCreateLesson} />
        </View>
      ) : null}
    </Screen>
  );
}
