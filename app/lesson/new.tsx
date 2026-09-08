import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import {
  applyTemplateToLesson,
  listTemplateBlocks,
  listTemplatesForGroup,
  templateTotalMinutes,
} from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { GroupCard } from '@/features/groups/components/GroupCard';
import { createLessonForGroup } from '@/features/lessons/createLesson';
import { formatFullDate, todayKey } from '@/lib/date';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, Text } from '@/ui';

/**
 * Новый конспект: выбор группы, затем шаблона. Шаблон группы по умолчанию
 * предлагается сразу, но можно взять другой или начать с пустого (п. 4.7 ТЗ).
 */
export default function NewLessonScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string; groupId?: string }>();
  const date = params.date ?? todayKey();

  const [groupId, setGroupId] = useState<number | null>(
    params.groupId ? Number(params.groupId) : null,
  );

  const groups = useDbQuery((database) => listGroups(database), []);
  const templates = useDbQuery(
    (database) =>
      (groupId === null ? [] : listTemplatesForGroup(database, groupId)).map((template) => {
        const blocks = listTemplateBlocks(database, template.id);
        return {
          ...template,
          blocksCount: blocks.length,
          totalMinutes: templateTotalMinutes(blocks),
        };
      }),
    [groupId],
  );

  const group = groups.find((item) => item.id === groupId) ?? null;

  function create(templateId: number | null) {
    if (!group) return;

    const lesson = createLessonForGroup(db, group, date);
    if (templateId !== null) {
      applyTemplateToLesson(db, templateId, lesson.id);
    }
    bumpDbRevision();
    router.replace(`/lesson/${lesson.id}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Новый конспект' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}
      >
        <Text tone="muted">Урок на {formatFullDate(date)}</Text>

        {group === null ? (
          <>
            <Text variant="subtitle">Выберите группу</Text>
            {groups.length === 0 ? (
              <EmptyState
                title="Сначала нужна группа"
                description="Конспект всегда принадлежит группе: «Дети 8–10», «Взрослые 16+»."
                actionTitle="Создать группу"
                onAction={() => router.replace('/group/edit')}
              />
            ) : (
              groups.map((item) => (
                <GroupCard key={item.id} group={item} onPress={() => setGroupId(item.id)} />
              ))
            )}
          </>
        ) : (
          <>
            <Text variant="subtitle">{group.name}</Text>

            {templates.length === 0 ? (
              <Card>
                <Text tone="muted">
                  Для этой группы шаблонов нет. Урок начнётся с пустой структуры — блоки можно
                  добавить вручную или применить шаблон позже.
                </Text>
              </Card>
            ) : (
              <>
                <Text variant="label" tone="muted">
                  С какого шаблона начать
                </Text>
                {templates.map((template) => {
                  const isDefault = group.defaultTemplateId === template.id;

                  return (
                    <Card key={template.id} onPress={() => create(template.id)}>
                      <View
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: theme.spacing.sm,
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text variant="subtitle" style={{ flex: 1 }}>
                          {template.name}
                        </Text>
                        {isDefault ? (
                          <Text variant="caption" tone="accent">
                            по умолчанию
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="caption" tone="muted">
                        {template.blocksCount} блоков · {template.totalMinutes} мин
                        {template.groupId === null ? ' · общий шаблон' : ''}
                      </Text>
                    </Card>
                  );
                })}
              </>
            )}

            <Button title="Начать с пустого конспекта" onPress={() => create(null)} />

            {params.groupId ? null : (
              <Button title="Другая группа" variant="secondary" onPress={() => setGroupId(null)} />
            )}
          </>
        )}

        <View style={{ paddingTop: theme.spacing.sm }}>
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
