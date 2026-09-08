import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import {
  createBlock,
  listBlocksWithMaterials,
  nextBlockSortOrder,
  reorderBlocks,
  type BlockMaterialItem,
  type BlockWithMaterials,
} from '@/db/repositories/blocks.repo';
import { duplicateLesson, getLesson } from '@/db/repositories/lessons.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { BlockCard } from '@/features/lessons/components/BlockCard';
import { LessonHeaderCard } from '@/features/lessons/components/LessonHeaderCard';
import { LessonTimeBar } from '@/features/lessons/components/LessonTimeBar';
import { MaterialPlayerSheet } from '@/features/lessons/components/MaterialPlayerSheet';
import { lessonToText } from '@/features/lessons/lessonToText';
import { addDays, formatFullDate } from '@/lib/date';
import { getLessonTimeSummary } from '@/lib/lessonTime';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text } from '@/ui';

export default function LessonScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);

  const [openedMaterial, setOpenedMaterial] = useState<BlockMaterialItem | null>(null);

  const lesson = useDbQuery((database) => getLesson(database, lessonId), [lessonId]);
  const blocks = useDbQuery((database) => listBlocksWithMaterials(database, lessonId), [lessonId]);

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Конспект' }} />
        <EmptyState title="Конспект не найден" />
      </Screen>
    );
  }

  const summary = getLessonTimeSummary(blocks, lesson.plannedMinutes);

  function handleAddBlock() {
    const created = createBlock(db, {
      lessonId,
      title: 'Новый блок',
      kind: 'free',
      plannedMinutes: 10,
      sortOrder: nextBlockSortOrder(db, lessonId),
    });
    bumpDbRevision();
    router.push(`/lesson/${lessonId}/block?blockId=${created.id}`);
  }

  function handleReorder(ordered: BlockWithMaterials[]) {
    reorderBlocks(
      db,
      ordered.map((block) => block.id),
    );
    bumpDbRevision();
  }

  function handleDuplicate() {
    if (!lesson) return;
    const newDate = addDays(lesson.date, 7);

    Alert.alert(
      'Дублировать конспект?',
      `Копия будет создана на ${formatFullDate(newDate)} — через неделю. Дату можно поменять в копии. Материалы не копируются: копия ссылается на те же файлы.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Дублировать',
          onPress: () => {
            const copy = duplicateLesson(db, lesson.id, newDate);
            bumpDbRevision();
            if (copy) router.replace(`/lesson/${copy.id}`);
          },
        },
      ],
    );
  }

  async function handleShare() {
    if (!lesson) return;
    await Share.share({ message: lessonToText(lesson, blocks) });
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: `Урок ${lesson.orderNumber}` }} />

      <DraggableFlatList
        data={blocks}
        keyExtractor={(item) => String(item.id)}
        onDragEnd={({ data }) => handleReorder(data)}
        activationDistance={12}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xs }}>
            <LessonHeaderCard
              lesson={lesson}
              onPress={() => router.push(`/lesson/${lessonId}/edit`)}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                title="Дублировать"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleDuplicate}
              />
              <Button
                title="Шаблон"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push(`/lesson/${lessonId}/template`)}
              />
              <Button
                title="Поделиться"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleShare}
              />
            </View>
            <Button title="Провести урок" onPress={() => router.push(`/lesson/${lessonId}/run`)} />

            <Text variant="caption" tone="muted">
              Тап по блоку — редактирование, долгое нажатие — перетаскивание.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="В конспекте пока нет блоков"
            description="Блок — это часть урока: разминка, кросс, партер, комбинация."
            actionTitle="Добавить блок"
            onAction={handleAddBlock}
          />
        }
        renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<BlockWithMaterials>) => (
          <BlockCard
            block={item}
            index={getIndex() ?? 0}
            isActive={isActive}
            onLongPress={drag}
            onPress={() => router.push(`/lesson/${lessonId}/block?blockId=${item.id}`)}
            onAddMaterial={() => router.push(`/lesson/${lessonId}/attach?blockId=${item.id}`)}
            onOpenMaterial={setOpenedMaterial}
          />
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
        <LessonTimeBar summary={summary} />
        {blocks.length > 0 ? <Button title="Добавить блок" onPress={handleAddBlock} /> : null}
      </View>

      <MaterialPlayerSheet
        item={openedMaterial}
        onClose={() => setOpenedMaterial(null)}
        onEdit={(item) => {
          setOpenedMaterial(null);
          router.push(`/lesson/${lessonId}/attachment?blockMaterialId=${item.id}`);
        }}
      />
    </Screen>
  );
}
