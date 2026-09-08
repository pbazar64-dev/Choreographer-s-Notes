import { Stack, useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';

import { listGroups } from '@/db/repositories/groups.repo';
import {
  createTemplate,
  listTemplateBlocks,
  listTemplates,
  templateTotalMinutes,
} from '@/db/repositories/templates.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, Text } from '@/ui';

export default function TemplatesScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();

  const groups = useDbQuery((database) => listGroups(database, true), []);
  const templates = useDbQuery(
    (database) =>
      listTemplates(database).map((template) => {
        const blocks = listTemplateBlocks(database, template.id);
        return {
          ...template,
          blocksCount: blocks.length,
          totalMinutes: templateTotalMinutes(blocks),
        };
      }),
    [],
  );

  function handleCreate() {
    const template = createTemplate(db, { name: 'Новый шаблон', groupId: null });
    bumpDbRevision();
    router.push(`/templates/${template.id}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Шаблоны уроков' }} />

      <FlatList
        data={templates}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <Text variant="caption" tone="muted" style={{ paddingBottom: theme.spacing.xs }}>
            Шаблон — это готовая структура урока. У детей и у взрослых логика занятия разная,
            поэтому шаблон можно привязать к группе или оставить общим.
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            title="Шаблонов пока нет"
            description="Создайте шаблон здесь или сохраните структуру готового конспекта как шаблон."
            actionTitle="Создать шаблон"
            onAction={handleCreate}
          />
        }
        renderItem={({ item }) => {
          const group = groups.find((candidate) => candidate.id === item.groupId);

          return (
            <Card
              onPress={() => router.push(`/templates/${item.id}`)}
              accentColor={group?.colorHex}
            >
              <Text variant="subtitle">{item.name}</Text>
              <Text variant="caption" tone="muted">
                {group ? group.name : 'Общий шаблон'} · {formatBlocksCount(item.blocksCount)} ·{' '}
                {item.totalMinutes} мин
              </Text>
            </Card>
          );
        }}
      />

      {templates.length > 0 ? (
        <View style={{ paddingBottom: theme.spacing.lg }}>
          <Button title="Создать шаблон" onPress={handleCreate} />
        </View>
      ) : null}
    </Screen>
  );
}

function formatBlocksCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} блоков`;
  if (last === 1) return `${count} блок`;
  if (last >= 2 && last <= 4) return `${count} блока`;
  return `${count} блоков`;
}
