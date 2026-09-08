import { View } from 'react-native';

import type { LessonListItem } from '@/db/repositories/lessons.repo';
import { formatFullDate } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/ui';

import { lessonStatusLabel } from '../status';

/** Шапка конспекта: группа, дата и время, номер урока, цель занятия (п. 4.3 ТЗ). */
export function LessonHeaderCard({
  lesson,
  onPress,
}: {
  lesson: LessonListItem;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Card onPress={onPress} accentColor={lesson.groupColorHex}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'space-between',
        }}
      >
        <Text variant="caption" tone="muted">
          {lesson.groupName} · урок {lesson.orderNumber}
        </Text>
        <Badge label={lessonStatusLabel(lesson.status)} />
      </View>

      <Text variant="title" scaled>
        {lesson.title}
      </Text>

      <Text tone="muted">
        {formatFullDate(lesson.date)}
        {lesson.startTime ? `, ${lesson.startTime}` : ''} · {lesson.plannedMinutes} мин
      </Text>

      {lesson.goal.trim() ? (
        <Text scaled style={{ paddingTop: theme.spacing.xs }}>
          Цель: {lesson.goal.trim()}
        </Text>
      ) : null}
    </Card>
  );
}
