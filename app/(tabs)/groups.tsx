import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { GroupCard } from '@/features/groups/components/GroupCard';
import { GroupLessonsPanel } from '@/features/groups/components/GroupLessonsPanel';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text, TwoPane, useWideLayout } from '@/ui';

export default function GroupsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const wide = useWideLayout();

  const [showArchived, setShowArchived] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const groups = useDbQuery((db) => listGroups(db, showArchived), [showArchived]);
  const archivedCount = useDbQuery(
    (db) => listGroups(db, true).filter((group) => group.isArchived).length,
    [],
  );

  // На планшете группа открывается в правой панели, на телефоне — отдельным экраном.
  const activeGroupId =
    wide && selectedGroupId !== null && groups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : wide
        ? (groups[0]?.id ?? null)
        : null;

  function handleOpenGroup(groupId: number) {
    if (wide) {
      setSelectedGroupId(groupId);
      setSearch('');
      return;
    }
    router.push(`/group/${groupId}`);
  }

  const list = (
    <View style={{ flex: 1 }}>
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xxxl,
          paddingTop: theme.spacing.lg,
        }}
        ListEmptyComponent={
          <EmptyState
            title="Групп пока нет"
            description="Группа — это папка конспектов: «Дети 8–10», «Взрослые 16+»."
            actionTitle="Создать группу"
            onAction={() => router.push('/group/edit')}
          />
        }
        ListFooterComponent={
          archivedCount > 0 ? (
            <View style={{ paddingTop: theme.spacing.md }}>
              <Button
                variant="ghost"
                title={showArchived ? 'Скрыть архив' : `Показать архив (${archivedCount})`}
                onPress={() => setShowArchived((value) => !value)}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => handleOpenGroup(item.id)} />
        )}
      />

      {groups.length > 0 ? (
        <View style={{ paddingBottom: theme.spacing.lg }}>
          <Button title="Новая группа" onPress={() => router.push('/group/edit')} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <TwoPane
        list={list}
        detail={
          activeGroupId === null ? (
            <EmptyState
              title="Выберите группу"
              description="Слева список групп, здесь появятся её конспекты."
            />
          ) : (
            <>
              <Text variant="title" style={{ paddingTop: theme.spacing.lg }}>
                {groups.find((group) => group.id === activeGroupId)?.name ?? ''}
              </Text>
              <GroupLessonsPanel
                key={activeGroupId}
                groupId={activeGroupId}
                search={search}
                onSearchChange={setSearch}
                onOpenLesson={(lessonId) => router.push(`/lesson/${lessonId}`)}
                onCreateLesson={() => router.push(`/lesson/new?groupId=${activeGroupId}`)}
                onEditGroup={() => router.push(`/group/edit?groupId=${activeGroupId}`)}
              />
            </>
          )
        }
      />
    </Screen>
  );
}
