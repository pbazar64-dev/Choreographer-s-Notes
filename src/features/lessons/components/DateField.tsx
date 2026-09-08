import { View } from 'react-native';

import { DATE_KEY_FORMAT, addDays, dayjs, formatLessonDate } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text, TextField } from '@/ui';

export function isValidDateKey(value: string): boolean {
  return dayjs(value, DATE_KEY_FORMAT, true).isValid();
}

/**
 * Ввод даты в формате ГГГГ-ММ-ДД со сдвигом на день и подписью по-русски.
 * На Э5 сюда добавится выбор даты прямо в календаре.
 */
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
      {valid ? (
        <Text variant="caption" tone="muted">
          {formatLessonDate(value)}
        </Text>
      ) : null}
    </View>
  );
}
