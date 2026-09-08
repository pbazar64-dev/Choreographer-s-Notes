import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { DEFAULT_BLOCK_KIND } from '@/constants/blockKinds';
import { deleteBlock, getBlock, updateBlock } from '@/db/repositories/blocks.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { KindPicker } from '@/features/lessons/components/KindPicker';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text, TextField } from '@/ui';

export default function BlockEditScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ lessonId: string; blockId: string }>();
  const blockId = Number(params.blockId);

  const block = useDbQuery((database) => getBlock(database, blockId), [blockId]);

  const [title, setTitle] = useState(block?.title ?? '');
  const [kind, setKind] = useState(block?.kind ?? DEFAULT_BLOCK_KIND);
  const [minutes, setMinutes] = useState(String(block?.plannedMinutes ?? 10));
  const [notes, setNotes] = useState(block?.notes ?? '');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [minutesError, setMinutesError] = useState<string | undefined>();

  if (!block) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Блок' }} />
        <EmptyState title="Блок не найден" />
      </Screen>
    );
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const parsedMinutes = Number(minutes.replace(',', '.'));

    if (!trimmedTitle) {
      setTitleError('Название обязательно');
      return;
    }
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 600) {
      setMinutesError('Введите время от 0 до 600 минут');
      return;
    }

    updateBlock(db, blockId, {
      title: trimmedTitle,
      kind,
      plannedMinutes: Math.round(parsedMinutes),
      notes,
    });
    bumpDbRevision();
    router.back();
  }

  function handleDelete() {
    Alert.alert(
      'Удалить блок?',
      'Прикреплённые материалы останутся в общей базе — удалятся только их связи с этим блоком.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteBlock(db, blockId);
            bumpDbRevision();
            router.back();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Блок урока' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Название блока"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setTitleError(undefined);
          }}
          placeholder="Разминка"
          error={titleError}
        />

        <KindPicker value={kind} onChange={setKind} />

        <TextField
          label="Плановое время, мин"
          value={minutes}
          onChangeText={(value) => {
            setMinutes(value.replace(/[^0-9]/g, ''));
            setMinutesError(undefined);
          }}
          keyboardType="number-pad"
          error={minutesError}
        />

        <TextField
          label="Заметки"
          value={notes}
          onChangeText={setNotes}
          placeholder="Что делаем, на что смотреть, типичные ошибки"
          multiline
        />

        <Text variant="caption" tone="muted">
          Прикрепление видео и музыки к блоку появится на этапе Э4.
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
          <Button title="Удалить блок" variant="danger" onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}
