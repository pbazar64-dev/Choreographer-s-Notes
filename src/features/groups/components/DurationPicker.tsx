import { Pressable, View } from 'react-native';

import { LESSON_DURATIONS, lessonDurationLabel } from '@/constants/lessonDurations';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';
import { Text } from '@/ui';

/** Длительность урока выбирается только из пресетов: 30 / 45 / 60 / 90 / 120 минут. */
export function DurationPicker({
  label = 'Длительность урока',
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {LESSON_DURATIONS.map((minutes) => {
          const selected = minutes === value;
          return (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(minutes)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                justifyContent: 'center',
                minHeight: HIT_SIZE,
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              <Text variant="label" tone={selected ? 'inverse' : 'default'}>
                {lessonDurationLabel(minutes)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
