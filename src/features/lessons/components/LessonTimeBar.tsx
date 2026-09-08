import { View } from 'react-native';

import type { LessonTimeSummary } from '@/lib/lessonTime';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

/**
 * Индикатор суммы времени: «Запланировано 62 мин из 60».
 * При превышении подсвечивается красным — критичный для работы элемент (п. 4.3 ТЗ).
 */
export function LessonTimeBar({ summary }: { summary: LessonTimeSummary }) {
  const theme = useTheme();
  const over = summary.isOver;

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: over ? theme.colors.dangerMuted : theme.colors.surfaceMuted,
        borderRadius: theme.radii.md,
        flexDirection: 'row',
        gap: theme.spacing.sm,
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
      }}
    >
      <Text variant="label" tone={over ? 'danger' : 'default'}>
        {summary.label}
      </Text>
      <Text variant="caption" tone={over ? 'danger' : 'muted'}>
        {summary.isExact
          ? 'ровно'
          : over
            ? `+${summary.diffMinutes} мин`
            : `осталось ${-summary.diffMinutes} мин`}
      </Text>
    </View>
  );
}
