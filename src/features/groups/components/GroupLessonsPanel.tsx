import { Alert, FlatList, View } from 'react-native';

import { getGroup, setGroupArchived } from '@/db/repositories/groups.repo';
import { listGroupLessons } from '@/db/repositories/lessons.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { saveLessonsSort } from '@/features/settings/preferences';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useUiPrefs } from '@/stores/uiPrefs';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, SegmentedControl, Text, TextField } from '@/ui';

/**
 * Лента конспектов группы. Используется и как отдельный экран, и как правая
 * панель двухпанельного режима на планшете.
 */
export function GroupLessonsPanel({
  groupId,
  search,
  onSearchChange,
  onOpenLesson,
  onCreateLesson,
  onEditGroup,
  showDescription = true,
}: {
  groupId: number;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenLesson: (lessonId: number) => void;
  onCreateLesson: () => void;
  onEditGroup: () => void;
  showDescription?: boolean;
}) {
  const db = useDatabase();
  const theme = useTheme();
  const newestFirst = useUiPrefs((state) => state.lessonsNewestFirst);

  const group = useDbQuery((database) => getGroup(database, groupId), [groupId]);
  const lessons = useDbQuery(
    (database) => listGroupLessons(database, groupId, { newestFirst, search }),
    [groupId, newestFirst, search],
  );

  if (!group) {
    return <EmptyState title="Группа не найдена" />;
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

  return (
    <View style={{ flex: 1 }}>
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
            {showDescription && group.description ? (
              <Text tone="muted">{group.description}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                title="Редактировать"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={onEditGroup}
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
              onChangeText={onSearchChange}
              placeholder="Поиск по конспектам и заметкам"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />

            <SegmentedControl
              value={newestFirst ? 'newest' : 'oldest'}
              onChange={(value) => saveLessonsSort(db, value === 'newest')}
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
              onAction={onCreateLesson}
            />
          )
        }
        renderItem={({ item }) => (
          <LessonCard lesson={item} onPress={() => onOpenLesson(item.id)} />
        )}
      />

      {lessons.length > 0 ? (
        <View style={{ paddingBottom: theme.spacing.lg }}>
          <Button title="Новый конспект" onPress={onCreateLesson} />
        </View>
      ) : null}
    </View>
  );
}
