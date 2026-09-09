import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { DEFAULT_GROUP_COLOR } from '@/constants/groupColors';
import { DEFAULT_LESSON_MINUTES } from '@/constants/lessonDurations';
import {
  countGroupLessons,
  createGroup,
  deleteGroup,
  getGroup,
  updateGroup,
} from '@/db/repositories/groups.repo';
import { listGroupSlots, replaceGroupSlots } from '@/db/repositories/schedule.repo';
import { listTemplatesForGroup } from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { ColorPicker } from '@/features/groups/components/ColorPicker';
import { DurationPicker } from '@/features/groups/components/DurationPicker';
import { ScheduleEditor, type ScheduleDraft } from '@/features/schedule/components/ScheduleEditor';
import { isValidTime, slotDurationMinutes } from '@/features/schedule/schedule';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Screen, Text, TextField } from '@/ui';

export default function GroupEditScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = params.groupId ? Number(params.groupId) : null;

  const group = useDbQuery((database) => (groupId ? getGroup(database, groupId) : null), [groupId]);
  const lessonsCount = useDbQuery(
    (database) => (groupId ? countGroupLessons(database, groupId) : 0),
    [groupId],
  );

  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [colorHex, setColorHex] = useState(group?.colorHex ?? DEFAULT_GROUP_COLOR);
  const [minutes, setMinutes] = useState(group?.defaultLessonMinutes ?? DEFAULT_LESSON_MINUTES);
  const [defaultTemplateId, setDefaultTemplateId] = useState<number | null>(
    group?.defaultTemplateId ?? null,
  );
  const [error, setError] = useState<string | undefined>();

  const templates = useDbQuery(
    (database) => (groupId ? listTemplatesForGroup(database, groupId) : []),
    [groupId],
  );
  const savedSlots = useDbQuery(
    (database) => (groupId ? listGroupSlots(database, groupId) : []),
    [groupId],
  );

  const [schedule, setSchedule] = useState<ScheduleDraft>(() =>
    Object.fromEntries(
      savedSlots.map((slot) => [
        slot.weekday,
        { startTime: slot.startTime, endTime: slot.endTime },
      ]),
    ),
  );

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Название обязательно');
      return;
    }

    const slots = Object.entries(schedule)
      .filter(([, slot]) => slot)
      .map(([weekday, slot]) => ({
        weekday: Number(weekday),
        startTime: slot?.startTime.trim() ?? '',
        endTime: slot?.endTime.trim() ?? '',
      }));

    const badSlot = slots.find(
      (slot) =>
        !isValidTime(slot.startTime) ||
        !isValidTime(slot.endTime) ||
        slotDurationMinutes(slot.startTime, slot.endTime) <= 0,
    );

    if (badSlot) {
      setError('Проверьте время в расписании: формат ЧЧ:ММ, окончание позже начала');
      return;
    }

    if (groupId) {
      updateGroup(db, groupId, {
        name: trimmed,
        description: description.trim(),
        colorHex,
        defaultLessonMinutes: minutes,
        defaultTemplateId,
      });
      replaceGroupSlots(db, groupId, slots);
    } else {
      const created = createGroup(db, {
        name: trimmed,
        description: description.trim(),
        colorHex,
        defaultLessonMinutes: minutes,
      });
      replaceGroupSlots(db, created.id, slots);
    }

    bumpDbRevision();
    router.back();
  }

  function handleDelete() {
    if (!groupId) return;

    Alert.alert(
      'Удалить группу?',
      lessonsCount > 0
        ? `Вместе с группой будут удалены её конспекты (${lessonsCount}). Материалы останутся в общей базе. Отменить это действие нельзя.`
        : 'Отменить это действие нельзя.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteGroup(db, groupId);
            bumpDbRevision();
            router.dismissTo('/groups');
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: groupId ? 'Редактирование группы' : 'Новая группа' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Название"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(undefined);
          }}
          placeholder="Дети 8–10"
          error={error}
          autoFocus={!groupId}
        />

        <TextField
          label="Описание"
          value={description}
          onChangeText={setDescription}
          placeholder="Контемпорари, младшая группа"
          multiline
        />

        <ColorPicker value={colorHex} onChange={setColorHex} />

        <ScheduleEditor value={schedule} onChange={setSchedule} />

        <DurationPicker
          label="Длительность урока по умолчанию"
          value={minutes}
          onChange={setMinutes}
        />

        {groupId && templates.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" tone="muted">
              Шаблон урока по умолчанию
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <Button
                title="Без шаблона"
                variant={defaultTemplateId === null ? 'primary' : 'secondary'}
                onPress={() => setDefaultTemplateId(null)}
              />
              {templates.map((template) => (
                <Button
                  key={template.id}
                  title={template.name}
                  variant={defaultTemplateId === template.id ? 'primary' : 'secondary'}
                  onPress={() => setDefaultTemplateId(template.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
        </View>

        {groupId ? (
          <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xl }}>
            <Text variant="caption" tone="muted">
              Обычно группу достаточно убрать в архив — она перестанет мешать в списке, а конспекты
              останутся.
            </Text>
            <Button title="Удалить группу" variant="danger" onPress={handleDelete} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
