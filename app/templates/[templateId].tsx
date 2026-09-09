import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';

import { blockKindLabel } from '@/constants/blockKinds';
import { listGroups } from '@/db/repositories/groups.repo';
import {
  createTemplateBlock,
  deleteTemplate,
  getTemplateWithBlocks,
  listTemplateBlocks,
  reorderTemplateBlocks,
  templateTotalMinutes,
  updateTemplate,
} from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { moveItem } from '@/lib/reorder';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, Screen, Text, TextField } from '@/ui';

export default function TemplateEditScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ templateId: string }>();
  const templateId = Number(params.templateId);

  const template = useDbQuery(
    (database) => getTemplateWithBlocks(database, templateId),
    [templateId],
  );
  const groups = useDbQuery((database) => listGroups(database, true), []);
  const blocks = useDbQuery((database) => listTemplateBlocks(database, templateId), [templateId]);

  const [name, setName] = useState(template?.name ?? '');

  if (!template) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Шаблон' }} />
        <EmptyState title="Шаблон не найден" />
      </Screen>
    );
  }

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === template?.name) return;

    updateTemplate(db, templateId, { name: trimmed });
    bumpDbRevision();
  }

  function setGroup(groupId: number | null) {
    updateTemplate(db, templateId, { groupId });
    bumpDbRevision();
  }

  function handleMove(from: number, to: number) {
    reorderTemplateBlocks(
      db,
      moveItem(
        blocks.map((block) => block.id),
        from,
        to,
      ),
    );
    bumpDbRevision();
  }

  function handleAddBlock() {
    const created = createTemplateBlock(db, templateId, {
      title: 'Новый блок',
      kind: 'free',
      plannedMinutes: 10,
      defaultNotes: '',
    });
    bumpDbRevision();
    router.push(`/templates/block?blockId=${created.id}`);
  }

  function handleDelete() {
    Alert.alert('Удалить шаблон?', 'Уроки, созданные по этому шаблону, останутся без изменений.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deleteTemplate(db, templateId);
          bumpDbRevision();
          router.back();
        },
      },
    ]);
  }

  const totalMinutes = templateTotalMinutes(blocks);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: template.name }} />

      <FlatList
        data={blocks}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xs }}>
            <TextField
              label="Название шаблона"
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              placeholder="Базовый урок 8–10"
            />

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" tone="muted">
                Для какой группы
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                <GroupChip
                  label="Общий"
                  active={template.groupId === null}
                  onPress={() => setGroup(null)}
                />
                {groups.map((group) => (
                  <GroupChip
                    key={group.id}
                    label={group.name}
                    active={template.groupId === group.id}
                    onPress={() => setGroup(group.id)}
                  />
                ))}
              </View>
            </View>

            <Text variant="caption" tone="muted">
              Тап по блоку — редактирование. Кнопки «Выше» и «Ниже» меняют порядок. Всего{' '}
              {totalMinutes} мин.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="В шаблоне нет блоков"
            description="Добавьте разминку, кросс, партер — то, из чего обычно состоит урок."
            actionTitle="Добавить блок"
            onAction={handleAddBlock}
          />
        }
        renderItem={({ item, index }) => (
          <Card onPress={() => router.push(`/templates/block?blockId=${item.id}`)}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: theme.spacing.sm,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  {index + 1} · {blockKindLabel(item.kind)}
                </Text>
                <Text variant="subtitle">{item.title}</Text>
              </View>
              <Badge label={`${item.plannedMinutes} мин`} />
            </View>

            {item.defaultNotes.trim() ? (
              <Text tone="muted" numberOfLines={2}>
                {item.defaultNotes.trim()}
              </Text>
            ) : null}

            <View
              style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}
            >
              <Button
                title="Выше"
                variant="secondary"
                style={{ flex: 1 }}
                disabled={index === 0}
                onPress={() => handleMove(index, index - 1)}
              />
              <Button
                title="Ниже"
                variant="secondary"
                style={{ flex: 1 }}
                disabled={index === blocks.length - 1}
                onPress={() => handleMove(index, index + 1)}
              />
            </View>
          </Card>
        )}
      />

      <View
        style={{
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          gap: theme.spacing.sm,
          paddingBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
        }}
      >
        {blocks.length > 0 ? <Button title="Добавить блок" onPress={handleAddBlock} /> : null}
        <Button title="Удалить шаблон" variant="danger" onPress={handleDelete} />
      </View>
    </Screen>
  );
}

function GroupChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Button
      title={label}
      variant={active ? 'primary' : 'secondary'}
      onPress={onPress}
      style={{ minWidth: theme.spacing.xxxl * 2 }}
    />
  );
}
