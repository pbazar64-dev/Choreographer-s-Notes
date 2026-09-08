import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { GroupCard } from '@/features/groups/components/GroupCard';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen } from '@/ui';

export default function GroupsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [showArchived, setShowArchived] = useState(false);

  const groups = useDbQuery((db) => listGroups(db, showArchived), [showArchived]);
  const archivedCount = useDbQuery(
    (db) => listGroups(db, true).filter((group) => group.isArchived).length,
    [],
  );

  return (
    <Screen>
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
                title={
                  showArchived ? 'Скрыть архив' : `Показать архив (${archivedCount})`
                }
                onPress={() => setShowArchived((value) => !value)}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
        )}
      />

      {groups.length > 0 ? (
        <View style={{ paddingBottom: theme.spacing.lg }}>
          <Button title="Новая группа" onPress={() => router.push('/group/edit')} />
        </View>
      ) : null}
    </Screen>
  );
}
