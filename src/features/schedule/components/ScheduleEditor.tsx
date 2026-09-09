import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';
import { Text, TextField } from '@/ui';

import { WEEKDAYS, isValidTime, slotDurationMinutes } from '../schedule';

export type ScheduleDraft = Record<number, { startTime: string; endTime: string } | undefined>;

/** Постоянное расписание группы: у каждого дня своё время «от» и «до». */
export function ScheduleEditor({
  value,
  onChange,
}: {
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
}) {
  const theme = useTheme();

  function toggleDay(weekday: number) {
    const next = { ...value };
    if (next[weekday]) {
      delete next[weekday];
    } else {
      const template = Object.values(value).find(Boolean);
      next[weekday] = {
        startTime: template?.startTime ?? '16:00',
        endTime: template?.endTime ?? '17:00',
      };
    }
    onChange(next);
  }

  function setTime(weekday: number, field: 'startTime' | 'endTime', time: string) {
    const current = value[weekday];
    if (!current) return;
    onChange({ ...value, [weekday]: { ...current, [field]: time } });
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label" tone="muted">
          Постоянное расписание
        </Text>
        <Text variant="caption" tone="muted">
          Дни занятий будут отмечены в календаре. Конспект по такому дню создаётся одним тапом, а
          отдельное занятие можно отменить или перенести.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {WEEKDAYS.map((day) => {
          const active = Boolean(value[day.value]);
          return (
            <Pressable
              key={day.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={day.label}
              onPress={() => toggleDay(day.value)}
              style={{
                alignItems: 'center',
                backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                borderColor: active ? theme.colors.accent : theme.colors.border,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                justifyContent: 'center',
                minHeight: HIT_SIZE,
                minWidth: HIT_SIZE + 8,
              }}
            >
              <Text variant="label" tone={active ? 'inverse' : 'default'}>
                {day.short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {WEEKDAYS.filter((day) => value[day.value]).map((day) => {
        const slot = value[day.value];
        if (!slot) return null;

        const duration = slotDurationMinutes(slot.startTime, slot.endTime);
        const invalid = !isValidTime(slot.startTime) || !isValidTime(slot.endTime) || duration <= 0;

        return (
          <View key={day.value} style={{ gap: theme.spacing.xs }}>
            <Text variant="label">{day.label}</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Начало"
                  value={slot.startTime}
                  onChangeText={(time) => setTime(day.value, 'startTime', time)}
                  placeholder="16:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Окончание"
                  value={slot.endTime}
                  onChangeText={(time) => setTime(day.value, 'endTime', time)}
                  placeholder="17:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <Text variant="caption" tone={invalid ? 'danger' : 'muted'}>
              {invalid ? 'Время в формате ЧЧ:ММ, окончание позже начала' : `${duration} мин`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
