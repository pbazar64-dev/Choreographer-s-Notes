import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/ui';

/** Занятие по постоянному расписанию, для которого ещё нет конспекта. */
export function ScheduleSlotCard({
  groupName,
  groupColorHex,
  startTime,
  endTime,
  durationMinutes,
  cancelled,
  onCreateLesson,
  onCancel,
  onRestore,
}: {
  groupName: string;
  groupColorHex: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  cancelled: boolean;
  onCreateLesson: () => void;
  onCancel: () => void;
  onRestore: () => void;
}) {
  const theme = useTheme();

  return (
    <Card accentColor={cancelled ? theme.colors.border : groupColorHex}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'space-between',
        }}
      >
        <Text variant="caption" tone="muted">
          {cancelled ? 'Отменено' : 'По расписанию'} · {groupName}
        </Text>
        <Badge label={`${durationMinutes} мин`} />
      </View>

      <Text variant="subtitle" tone={cancelled ? 'muted' : 'default'}>
        {startTime}–{endTime}
      </Text>

      {cancelled ? (
        <Button title="Вернуть занятие" variant="secondary" onPress={onRestore} />
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
          <Button title="Создать конспект" style={{ flex: 2 }} onPress={onCreateLesson} />
          <Button title="Отменить" variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
        </View>
      )}
    </Card>
  );
}
