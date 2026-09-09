import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { DEFAULT_BLOCK_KIND } from '@/constants/blockKinds';
import {
  deleteTemplateBlock,
  getTemplateBlock,
  updateTemplateBlock,
} from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { KindPicker } from '@/features/lessons/components/KindPicker';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text, TextField } from '@/ui';

export default function TemplateBlockScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ blockId: string }>();
  const blockId = Number(params.blockId);

  const block = useDbQuery((database) => getTemplateBlock(database, blockId), [blockId]);

  const [title, setTitle] = useState(block?.title ?? '');
  const [kind, setKind] = useState(block?.kind ?? DEFAULT_BLOCK_KIND);
  const [minutes, setMinutes] = useState(String(block?.plannedMinutes ?? 10));
  const [notes, setNotes] = useState(block?.defaultNotes ?? '');
  const [errors, setErrors] = useState<{ title?: string; minutes?: string }>({});

  if (!block) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Блок шаблона' }} />
        <EmptyState title="Блок не найден" />
      </Screen>
    );
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const parsedMinutes = Number(minutes);

    if (!trimmedTitle) {
      setErrors({ title: 'Название обязательно' });
      return;
    }
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 600) {
      setErrors({ minutes: 'Введите время от 0 до 600 минут' });
      return;
    }

    updateTemplateBlock(db, blockId, {
      title: trimmedTitle,
      kind,
      plannedMinutes: Math.round(parsedMinutes),
      defaultNotes: notes,
    });
    bumpDbRevision();
    router.back();
  }

  function handleDelete() {
    Alert.alert('Удалить блок шаблона?', 'На уже созданные уроки это не повлияет.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deleteTemplateBlock(db, blockId);
          bumpDbRevision();
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Блок шаблона' }} />

      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Название блока"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setErrors({});
          }}
          placeholder="Разминка"
          error={errors.title}
        />

        <KindPicker value={kind} onChange={setKind} />

        <TextField
          label="Плановое время, мин"
          value={minutes}
          onChangeText={(value) => {
            setMinutes(value.replace(/[^0-9]/g, ''));
            setErrors({});
          }}
          keyboardType="number-pad"
          error={errors.minutes}
        />

        <TextField
          label="Заметки по умолчанию"
          value={notes}
          onChangeText={setNotes}
          placeholder="Подставятся в заметки блока при создании урока"
          multiline
        />

        <Text variant="caption" tone="muted">
          Материалы к шаблону не прикрепляются: они выбираются под конкретный урок.
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
          <Button title="Удалить блок" variant="danger" onPress={handleDelete} />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
