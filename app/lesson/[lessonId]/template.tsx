import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { listBlocks } from '@/db/repositories/blocks.repo';
import { getLesson } from '@/db/repositories/lessons.repo';
import {
  applyTemplateToLesson,
  createTemplateFromLesson,
  listTemplateBlocks,
  listTemplatesForGroup,
  templateTotalMinutes,
} from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

/** Применить шаблон к конспекту или сохранить структуру конспекта как шаблон. */
export default function LessonTemplateScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);

  const [mode, setMode] = useState<'apply' | 'save'>('apply');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'group' | 'common'>('group');
  const [error, setError] = useState<string | undefined>();

  const lesson = useDbQuery((database) => getLesson(database, lessonId), [lessonId]);
  const blocks = useDbQuery((database) => listBlocks(database, lessonId), [lessonId]);
  const templates = useDbQuery(
    (database) =>
      (lesson ? listTemplatesForGroup(database, lesson.groupId) : []).map((template) => {
        const templateBlocks = listTemplateBlocks(database, template.id);
        return {
          ...template,
          blocksCount: templateBlocks.length,
          totalMinutes: templateTotalMinutes(templateBlocks),
        };
      }),
    [lesson?.groupId ?? 0],
  );

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Шаблон' }} />
        <EmptyState title="Конспект не найден" />
      </Screen>
    );
  }

  function handleApply(templateId: number, templateName: string) {
    Alert.alert(
      'Применить шаблон?',
      blocks.length > 0
        ? `Блоки шаблона «${templateName}» добавятся в конец конспекта. Существующие блоки останутся на месте.`
        : `Блоки шаблона «${templateName}» станут структурой этого урока.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Применить',
          onPress: () => {
            applyTemplateToLesson(db, templateId, lessonId);
            bumpDbRevision();
            router.back();
          },
        },
      ],
    );
  }

  function handleSaveAsTemplate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Название шаблона обязательно');
      return;
    }
    if (blocks.length === 0) {
      setError('В конспекте нет блоков — сохранять нечего');
      return;
    }

    createTemplateFromLesson(db, lessonId, trimmed, scope === 'group' ? lesson!.groupId : null);
    bumpDbRevision();
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Шаблон структуры' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'apply', label: 'Применить шаблон' },
            { value: 'save', label: 'Сохранить как шаблон' },
          ]}
        />

        {mode === 'apply' ? (
          templates.length === 0 ? (
            <EmptyState
              title="Шаблонов для этой группы нет"
              description="Создайте шаблон в настройках или сохраните структуру этого конспекта."
            />
          ) : (
            templates.map((template) => (
              <Card key={template.id} onPress={() => handleApply(template.id, template.name)}>
                <Text variant="subtitle">{template.name}</Text>
                <Text variant="caption" tone="muted">
                  {template.blocksCount} блоков · {template.totalMinutes} мин
                  {template.groupId === null ? ' · общий шаблон' : ''}
                </Text>
              </Card>
            ))
          )
        ) : (
          <View style={{ gap: theme.spacing.lg }}>
            <Text tone="muted">
              Структура этого конспекта ({blocks.length} блоков) сохранится как шаблон: названия,
              виды, время и заметки. Материалы в шаблон не попадают.
            </Text>

            <TextField
              label="Название шаблона"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(undefined);
              }}
              placeholder="Базовый урок 8–10"
              error={error}
            />

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" tone="muted">
                Для кого шаблон
              </Text>
              <SegmentedControl
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'group', label: lesson.groupName },
                  { value: 'common', label: 'Общий' },
                ]}
              />
            </View>

            <Button title="Сохранить шаблон" onPress={handleSaveAsTemplate} />
          </View>
        )}

        <Button title="Закрыть" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
