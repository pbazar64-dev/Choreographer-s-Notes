import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, useWindowDimensions, View } from 'react-native';

import {
  countTagUsage,
  deleteTag,
  getMaterialsByIds,
  listMaterials,
  listTags,
} from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { AudioRow } from '@/features/materials/components/AudioRow';
import { MaterialFilters as MaterialFiltersRow } from '@/features/materials/components/MaterialFilters';
import { MaterialTile } from '@/features/materials/components/MaterialTile';
import { importFiles } from '@/features/materials/importMaterials';
import { PACK_MESSENGER_LIMIT_BYTES, packSize } from '@/features/materials/pack';
import { exportMaterialsPack } from '@/features/materials/packTransfer';
import {
  MATERIAL_SECTIONS,
  sectionForType,
  typesForSection,
  type MaterialSection,
} from '@/features/materials/types';
import { errorText } from '@/lib/errors';
import { pickMediaFiles } from '@/lib/media';
import { formatBytes } from '@/lib/mediaTypes';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { BottomBar, Button, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

const MIN_TILE_WIDTH = 180;

type Progress = { label: string; current: number; total: number; title: string };

export default function MaterialsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [section, setSection] = useState<MaterialSection>('video');
  const [search, setSearch] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  /** null — обычный режим; массив — идёт выбор материалов для набора. */
  const [selection, setSelection] = useState<number[] | null>(null);

  const tags = useDbQuery((database) => listTags(database), []);
  const materials = useDbQuery(
    (database) =>
      listMaterials(database, {
        search,
        types: typesForSection(section),
        tagIds,
      }),
    [section, search, tagIds.join(',')],
  );

  const isAudio = section === 'audio';
  const columns = isAudio
    ? 1
    : Math.max(2, Math.floor((width - theme.spacing.lg * 2) / MIN_TILE_WIDTH));
  const gap = theme.spacing.md;
  const tileWidth = (width - theme.spacing.lg * 2 - gap * (columns - 1)) / columns;

  const selecting = selection !== null;
  const selectedIds = selection ?? [];
  const visibleIds = materials.map((material) => material.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  async function handlePickFiles() {
    const files = await pickMediaFiles(true).catch(() => {
      Alert.alert(
        'Не удалось открыть выбор файлов',
        'Попробуйте ещё раз. Если не помогает — закройте и откройте приложение.',
      );
      return [];
    });
    if (files.length === 0) return;

    setProgress({ label: 'Копирую', current: 0, total: files.length, title: '' });
    try {
      const { imported, failed } = await importFiles(db, files, (step) =>
        setProgress({ label: 'Копирую', ...step }),
      );
      bumpDbRevision();

      if (failed.length > 0) {
        Alert.alert(
          'Часть файлов не добавилась',
          `Добавлено: ${imported.length}. Не удалось: ${failed.join(', ')}`,
        );
      }

      // Сразу открываем карточку, чтобы задать название, описание и теги
      // по горячим следам. Если файлов было несколько — открываем первый.
      const first = imported[0];
      if (first) {
        setSection(sectionForType(first.type));
        router.push(`/material/${first.id}`);
      }
    } finally {
      setProgress(null);
    }
  }

  function handleDeleteTag(tag: { id: number; name: string }) {
    const used = countTagUsage(db, tag.id);

    Alert.alert(
      `Удалить тег «${tag.name}»?`,
      used > 0
        ? `Тег снимется с материалов (${used}). Сами материалы и файлы останутся на месте.`
        : 'Тег нигде не используется.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteTag(db, tag.id);
            setTagIds((current) => current.filter((id) => id !== tag.id));
            bumpDbRevision();
          },
        },
      ],
    );
  }

  function toggleTag(tagId: number) {
    setTagIds((current) =>
      current.includes(tagId) ? current.filter((item) => item !== tagId) : [...current, tagId],
    );
  }

  function toggleSelected(materialId: number) {
    setSelection((current) => {
      const list = current ?? [];
      return list.includes(materialId)
        ? list.filter((id) => id !== materialId)
        : [...list, materialId];
    });
  }

  /** «Выбрать все» работает по текущему фильтру: отобрал по тегу — забрал разом. */
  function toggleAllVisible() {
    setSelection((current) => {
      const list = current ?? [];
      return allVisibleSelected
        ? list.filter((id) => !visibleIds.includes(id))
        : [...new Set([...list, ...visibleIds])];
    });
  }

  function handleSendPack() {
    const ids = selectedIds;
    if (ids.length === 0) return;

    const chosen = getMaterialsByIds(db, ids);
    const bytes = packSize(chosen);
    const heavy = bytes > PACK_MESSENGER_LIMIT_BYTES;

    Alert.alert(
      `Отправить ${ids.length} материалов?`,
      [
        `Размер набора: ${formatBytes(bytes)}.`,
        'Названия, описания и теги уедут вместе с файлами — у друга они сразу лягут в базу материалов.',
        heavy
          ? 'Такой файл не пройдёт через мессенджер: отправляйте через облако или скопируйте на карту.'
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отправить', onPress: () => void sendPack(ids) },
      ],
    );
  }

  async function sendPack(ids: readonly number[]) {
    setProgress({ label: 'Собираю набор', current: 0, total: ids.length, title: '' });

    try {
      const { skipped } = await exportMaterialsPack(db, ids, (step) =>
        setProgress({ label: 'Собираю набор', ...step }),
      );

      setSelection(null);

      if (skipped.length > 0) {
        Alert.alert(
          'Часть материалов не вошла',
          `Файлы не нашлись на планшете: ${skipped.join(', ')}.`,
        );
      }
    } catch (error) {
      Alert.alert('Не удалось собрать набор', errorText(error));
    } finally {
      setProgress(null);
    }
  }

  return (
    <Screen padded={false}>
      <FlatList
        key={`${section}-${columns}`}
        data={materials}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={columns > 1 ? { gap } : undefined}
        contentContainerStyle={{
          gap: isAudio ? theme.spacing.sm : gap,
          paddingBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
            {selecting ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.accentMuted,
                  borderRadius: theme.radii.md,
                  flexDirection: 'row',
                  gap: theme.spacing.sm,
                  padding: theme.spacing.sm,
                }}
              >
                <Text variant="label" style={{ flex: 1 }}>
                  Выбрано: {selectedIds.length}
                </Text>
                <Button
                  title={allVisibleSelected ? 'Снять все' : 'Выбрать все'}
                  variant="secondary"
                  onPress={toggleAllVisible}
                  disabled={visibleIds.length === 0}
                />
              </View>
            ) : null}

            <SegmentedControl
              value={section}
              onChange={setSection}
              options={MATERIAL_SECTIONS.map((item) => ({ value: item.code, label: item.label }))}
            />

            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск по названию материала"
              returnKeyType="search"
            />

            <MaterialFiltersRow
              tags={tags}
              activeTagIds={tagIds}
              onToggleTag={toggleTag}
              onDeleteTag={handleDeleteTag}
            />

            {progress ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                }}
              >
                <ActivityIndicator color={theme.colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">
                    {progress.label} {progress.current} из {progress.total}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {progress.title}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={search || tagIds.length > 0 ? 'Ничего не найдено' : 'Здесь пока пусто'}
            description="Видео и музыка живут здесь и подставляются в конспекты ссылками: один файл — сколько угодно уроков."
          />
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          const open = () =>
            selecting ? toggleSelected(item.id) : router.push(`/material/${item.id}`);

          return isAudio ? (
            <AudioRow material={item} selected={selected} onPress={open} />
          ) : (
            <MaterialTile
              material={item}
              width={tileWidth}
              selected={selected}
              onPress={open}
              onLongPress={() => toggleSelected(item.id)}
            />
          );
        }}
      />

      <BottomBar>
        {selecting ? (
          <>
            <Button
              title="Отмена"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setSelection(null)}
              disabled={progress !== null}
            />
            <Button
              title={`Отправить (${selectedIds.length})`}
              style={{ flex: 1 }}
              onPress={handleSendPack}
              disabled={progress !== null || selectedIds.length === 0}
            />
          </>
        ) : (
          <>
            <Button
              title="Файлы"
              style={{ flex: 1 }}
              onPress={handlePickFiles}
              disabled={progress !== null}
            />
            <Button
              title="Ссылка"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => router.push('/material/add-link')}
              disabled={progress !== null}
            />
            <Button
              title="Поделиться"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setSelection([])}
              disabled={progress !== null || materials.length === 0}
            />
          </>
        )}
      </BottomBar>
    </Screen>
  );
}
