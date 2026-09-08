import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { getGroup } from '@/db/repositories/groups.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { GroupLessonsPanel } from '@/features/groups/components/GroupLessonsPanel';
import { EmptyState, Screen } from '@/ui';

export default function GroupLessonsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = Number(params.groupId);
  const [search, setSearch] = useState('');

  const group = useDbQuery((database) => getGroup(database, groupId), [groupId]);

  if (!group) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Группа' }} />
        <EmptyState title="Группа не найдена" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: group.name }} />
      <GroupLessonsPanel
        groupId={groupId}
        search={search}
        onSearchChange={setSearch}
        onOpenLesson={(lessonId) => router.push(`/lesson/${lessonId}`)}
        onCreateLesson={() => router.push(`/lesson/new?groupId=${groupId}`)}
        onEditGroup={() => router.push(`/group/edit?groupId=${groupId}`)}
      />
    </Screen>
  );
}
