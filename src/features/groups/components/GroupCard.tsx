import { View } from 'react-native';

import type { GroupListItem } from '@/db/repositories/groups.repo';
import { lessonDurationLabel } from '@/constants/lessonDurations';
import { formatFullDate } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/ui';

export function GroupCard({ group, onPress }: { group: GroupListItem; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} accentColor={group.colorHex}>
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'space-between',
        }}
      >
        <Text variant="subtitle" style={{ flex: 1 }}>
          {group.name}
        </Text>
        {group.isArchived ? <Badge label="В архиве" /> : null}
      </View>

      {group.description ? (
        <Text tone="muted" numberOfLines={2}>
          {group.description}
        </Text>
      ) : null}

      <Text variant="caption" tone="muted">
        {formatLessonsCount(group.lessonsCount)} · урок{' '}
        {lessonDurationLabel(group.defaultLessonMinutes)}
        {group.lastLessonDate ? ` · последний ${formatFullDate(group.lastLessonDate)}` : ''}
      </Text>
    </Card>
  );
}

function formatLessonsCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} конспектов`;
  if (last === 1) return `${count} конспект`;
  if (last >= 2 && last <= 4) return `${count} конспекта`;
  return `${count} конспектов`;
}
