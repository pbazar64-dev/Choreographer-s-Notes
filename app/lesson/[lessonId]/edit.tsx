import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { deleteLesson, getLesson, updateLesson } from '@/db/repositories/lessons.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { DurationPicker } from '@/features/groups/components/DurationPicker';
import { DateField, isValidDateKey } from '@/features/lessons/components/DateField';
import { LESSON_STATUS_LABELS } from '@/features/lessons/status';
import type { LessonStatus } from '@/db/schema';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function LessonEditScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);

  const lesson = useDbQuery((database) => getLesson(database, lessonId), [lessonId]);

  const [title, setTitle] = useState(lesson?.title ?? '');
  const [goal, setGoal] = useState(lesson?.goal ?? '');
  const [date, setDate] = useState(lesson?.date ?? '');
  const [startTime, setStartTime] = useState(lesson?.startTime ?? '');
  const [minutes, setMinutes] = useState(lesson?.plannedMinutes ?? 60);
  const [orderNumber, setOrderNumber] = useState(String(lesson?.orderNumber ?? 1));
  const [status, setStatus] = useState<LessonStatus>(lesson?.status ?? 'draft');
  const [errors, setErrors] = useState<{ title?: string; date?: string; time?: string }>({});

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Конспект' }} />
        <EmptyState title="Конспект не найден" />
      </Screen>
    );
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedTime = startTime.trim();
    const nextErrors: typeof errors = {};

    if (!trimmedTitle) nextErrors.title = 'Название обязательно';
    if (!isValidDateKey(date)) nextErrors.date = 'Дата в формате ГГГГ-ММ-ДД';
    if (trimmedTime && !TIME_PATTERN.test(trimmedTime)) nextErrors.time = 'Время в формате ЧЧ:ММ';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const parsedOrder = Number(orderNumber);

    updateLesson(db, lessonId, {
      title: trimmedTitle,
      goal: goal.trim(),
      date,
      startTime: trimmedTime || null,
      plannedMinutes: minutes,
      orderNumber: Number.isFinite(parsedOrder) && parsedOrder > 0 ? Math.round(parsedOrder) : 1,
      status,
    });
    bumpDbRevision();
    router.back();
  }

  function handleDelete() {
    if (!lesson) return;

    Alert.alert(
      'Удалить конспект?',
      'Блоки и заметки урока будут удалены. Материалы останутся в общей базе.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteLesson(db, lessonId);
            bumpDbRevision();
            router.dismissTo(`/group/${lesson.groupId}`);
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Конспект урока' }} />

      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" tone="muted">
          {lesson.groupName}
        </Text>

        <TextField
          label="Название урока"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="Урок 3: волна и перекаты"
          error={errors.title}
        />

        <TextField
          label="Цель занятия"
          value={goal}
          onChangeText={setGoal}
          placeholder="Освоить перекат через спину"
          multiline
        />

        <DateField
          value={date}
          onChange={(value) => {
            setDate(value);
            setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          error={errors.date}
        />

        <TextField
          label="Время начала (ЧЧ:ММ, можно оставить пустым)"
          value={startTime}
          onChangeText={(value) => {
            setStartTime(value);
            setErrors((prev) => ({ ...prev, time: undefined }));
          }}
          placeholder="16:00"
          keyboardType="numbers-and-punctuation"
          error={errors.time}
        />

        <DurationPicker label="Длительность урока" value={minutes} onChange={setMinutes} />

        <TextField
          label="Номер урока в группе"
          value={orderNumber}
          onChangeText={(value) => setOrderNumber(value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="muted">
            Статус
          </Text>
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: 'draft', label: LESSON_STATUS_LABELS.draft },
              { value: 'planned', label: LESSON_STATUS_LABELS.planned },
              { value: 'done', label: LESSON_STATUS_LABELS.done },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
          <Button title="Удалить конспект" variant="danger" onPress={handleDelete} />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
