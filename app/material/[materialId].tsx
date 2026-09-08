import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import {
  addTagToMaterial,
  ensureTag,
  getMaterial,
  getMaterialUsage,
  listMaterialTags,
  removeTagFromMaterial,
  updateMaterial,
} from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { FilterChip } from '@/features/materials/components/MaterialFilters';
import { MaterialPlayer } from '@/features/materials/components/MaterialPlayer';
import { deleteMaterialWithFiles } from '@/features/materials/importMaterials';
import { MATERIAL_TYPE_LABELS } from '@/features/materials/types';
import { formatBytes } from '@/lib/files';
import { formatFullDate } from '@/lib/date';
import { formatDuration } from '@/lib/lessonTime';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, Text, TextField } from '@/ui';

export default function MaterialScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ materialId: string }>();
  const materialId = Number(params.materialId);

  const material = useDbQuery((database) => getMaterial(database, materialId), [materialId]);
  const tags = useDbQuery((database) => listMaterialTags(database, materialId), [materialId]);
  const usage = useDbQuery((database) => getMaterialUsage(database, materialId), [materialId]);

  const [title, setTitle] = useState(material?.title ?? '');
  const [description, setDescription] = useState(material?.description ?? '');
  const [newTag, setNewTag] = useState('');

  if (!material) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Материал' }} />
        <EmptyState title="Материал не найден" />
      </Screen>
    );
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;

    updateMaterial(db, materialId, { title: trimmed, description: description.trim() });
    bumpDbRevision();
  }

  function handleAddTag() {
    const name = newTag.trim();
    if (!name) return;

    const tag = ensureTag(db, name);
    addTagToMaterial(db, materialId, tag.id);
    setNewTag('');
    bumpDbRevision();
  }

  function handleDelete() {
    if (!material) return;

    const usageText =
      usage.length > 0
        ? `Материал используется в конспектах:\n${usage
            .map((item) => `— ${item.lessonTitle}: ${item.blockTitle}`)
            .join('\n')}\n\nОн исчезнет из этих блоков.`
        : 'Материал нигде не используется.';

    Alert.alert(
      'Удалить материал?',
      `${usageText}\n\nФайл будет удалён с планшета. Отменить это действие нельзя.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteMaterialWithFiles(db, material);
            bumpDbRevision();
            router.back();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: material.title }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <MaterialPlayer material={material} />

        <TextField label="Название" value={title} onChangeText={setTitle} onBlur={handleSave} />

        <TextField
          label="Описание"
          value={description}
          onChangeText={setDescription}
          onBlur={handleSave}
          placeholder="Чем полезно, на что обратить внимание"
          multiline
        />

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="muted">
            Теги
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {tags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={`${tag.name} ✕`}
                active
                onPress={() => {
                  removeTagFromMaterial(db, materialId, tag.id);
                  bumpDbRevision();
                }}
              />
            ))}
            {tags.length === 0 ? (
              <Text variant="caption" tone="muted">
                Тегов пока нет
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={newTag}
                onChangeText={setNewTag}
                placeholder="партер, прыжки, медленная"
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
            </View>
            <Button title="Добавить" variant="secondary" onPress={handleAddTag} />
          </View>
        </View>

        <Card>
          <Text variant="label">{MATERIAL_TYPE_LABELS[material.type]}</Text>
          <Text variant="caption" tone="muted">
            {material.durationSec ? `Длительность ${formatDuration(material.durationSec)} · ` : ''}
            {material.localPath ? `${formatBytes(material.fileSizeBytes)} · ` : ''}
            добавлен {formatFullDate(new Date(material.createdAt).toISOString().slice(0, 10))}
          </Text>
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="subtitle">Где используется</Text>
          {usage.length === 0 ? (
            <Text tone="muted">Материал пока не прикреплён ни к одному конспекту.</Text>
          ) : (
            usage.map((item) => (
              <Card
                key={`${item.blockId}-${item.lessonId}`}
                onPress={() => router.push(`/lesson/${item.lessonId}`)}
              >
                <Text variant="label">{item.lessonTitle}</Text>
                <Text variant="caption" tone="muted">
                  Блок «{item.blockTitle}» · {formatFullDate(item.lessonDate)}
                </Text>
              </Card>
            ))
          )}
        </View>

        <Button title="Удалить материал" variant="danger" onPress={handleDelete} />
      </ScrollView>
    </Screen>
  );
}
