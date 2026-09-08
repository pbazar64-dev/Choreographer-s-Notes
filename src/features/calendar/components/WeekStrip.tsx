import { Pressable, View } from 'react-native';

import { formatMonthTitle } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';
import { Button, Text } from '@/ui';

import { getWeekDays, shiftWeek } from '../weekDays';

export type DayDots = Record<string, string[]>;

/** Недельный вид: семь дней с точками цвета группы и стрелками по неделям. */
export function WeekStrip({
  selectedDate,
  onSelectDate,
  dots,
}: {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  dots: DayDots;
}) {
  const theme = useTheme();
  const days = getWeekDays(selectedDate);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Button
          title="‹"
          variant="ghost"
          onPress={() => onSelectDate(shiftWeek(selectedDate, -1))}
          accessibilityLabel="Предыдущая неделя"
        />
        <Text variant="label">{capitalize(formatMonthTitle(selectedDate))}</Text>
        <Button
          title="›"
          variant="ghost"
          onPress={() => onSelectDate(shiftWeek(selectedDate, 1))}
          accessibilityLabel="Следующая неделя"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        {days.map((day) => {
          const selected = day.dateKey === selectedDate;
          const dayDots = dots[day.dateKey] ?? [];

          return (
            <Pressable
              key={day.dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.weekdayShort} ${day.dayOfMonth}`}
              onPress={() => onSelectDate(day.dateKey)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? theme.colors.accent : 'transparent',
                borderColor: day.isToday && !selected ? theme.colors.accent : 'transparent',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                flex: 1,
                gap: 2,
                justifyContent: 'center',
                minHeight: HIT_SIZE + 12,
                paddingVertical: theme.spacing.xs,
              }}
            >
              <Text variant="caption" tone={selected ? 'inverse' : 'muted'}>
                {day.weekdayShort}
              </Text>
              <Text variant="label" tone={selected ? 'inverse' : 'default'}>
                {day.dayOfMonth}
              </Text>
              <View style={{ flexDirection: 'row', gap: 2, height: 6 }}>
                {dayDots.slice(0, 3).map((color, index) => (
                  <View
                    key={`${day.dateKey}-${index}`}
                    style={{
                      backgroundColor: color,
                      borderRadius: 3,
                      height: 6,
                      width: 6,
                    }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
