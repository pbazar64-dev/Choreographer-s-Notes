import { useState } from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { CALENDAR_FIRST_DAY } from '@/lib/calendarLocale';
import { DATE_KEY_FORMAT, addDays, dayjs, formatLessonDate } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text, TextField } from '@/ui';

export function isValidDateKey(value: string): boolean {
  return dayjs(value, DATE_KEY_FORMAT, true).isValid();
}

/** Дата урока: календарь как основной способ, поле ввода — как запасной. */
export function DateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (dateKey: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);
  const valid = isValidDateKey(value);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <TextField
        label="Дата урока (ГГГГ-ММ-ДД)"
        value={value}
        onChangeText={onChange}
        placeholder="2026-09-10"
        keyboardType="numbers-and-punctuation"
        error={error}
      />

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          title="− 1 день"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => valid && onChange(addDays(value, -1))}
        />
        <Button
          title="+ 1 день"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => valid && onChange(addDays(value, 1))}
        />
        <Button
          title="+ 7 дней"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => valid && onChange(addDays(value, 7))}
        />
      </View>

      <Button
        title={showCalendar ? 'Скрыть календарь' : 'Выбрать в календаре'}
        variant="ghost"
        onPress={() => setShowCalendar((current) => !current)}
      />

      {showCalendar ? (
        <Calendar
          key={theme.scheme}
          current={valid ? value : undefined}
          firstDay={CALENDAR_FIRST_DAY}
          markedDates={
            valid ? { [value]: { selected: true, selectedColor: theme.colors.accent } } : {}
          }
          onDayPress={(day: { dateString: string }) => {
            onChange(day.dateString);
            setShowCalendar(false);
          }}
          enableSwipeMonths
          theme={{
            backgroundColor: theme.colors.background,
            calendarBackground: theme.colors.background,
            textSectionTitleColor: theme.colors.textMuted,
            dayTextColor: theme.colors.text,
            todayTextColor: theme.colors.accent,
            monthTextColor: theme.colors.text,
            arrowColor: theme.colors.accent,
            selectedDayBackgroundColor: theme.colors.accent,
            selectedDayTextColor: theme.colors.textInverse,
            textDisabledColor: theme.colors.border,
          }}
        />
      ) : null}

      {valid ? (
        <Text variant="caption" tone="muted">
          {formatLessonDate(value)}
        </Text>
      ) : null}
    </View>
  );
}
