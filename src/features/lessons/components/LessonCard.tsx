import { View } from 'react-native';

import type { LessonListItem } from '@/db/repositories/lessons.repo';
import { formatLessonDate } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/ui';

import { lessonStatusLabel } from '../status';

export function LessonCard({
  lesson,
  onPress,
  showGroupName = false,
}: {
  lesson: LessonListItem;
  onPress?: () => void;
  showGroupName?: boolean;
}) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} accentColor={lesson.groupColorHex}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          Урок {lesson.orderNumber}
          {showGroupName ? ` · ${lesson.groupName}` : ''}
        </Text>
        <Badge label={lessonStatusLabel(lesson.status)} />
      </View>

      <Text variant="subtitle">{lesson.title}</Text>

      <Text variant="caption" tone="muted">
        {formatLessonDate(lesson.date)}
        {lesson.startTime ? `, ${lesson.startTime}` : ''} · {lesson.plannedMinutes} мин
      </Text>

      {lesson.goal ? (
        <Text tone="muted" numberOfLines={2}>
          {lesson.goal}
        </Text>
      ) : null}
    </Card>
  );
}
