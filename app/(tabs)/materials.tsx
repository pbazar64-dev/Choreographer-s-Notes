import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, useWindowDimensions, View } from 'react-native';

import {
  countTagUsage,
  deleteTag,
  listMaterials,
  listTags,
  type MaterialFilters,
} from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { AudioRow } from '@/features/materials/components/AudioRow';
import { MaterialFilters as MaterialFiltersRow } from '@/features/materials/components/MaterialFilters';
import { MaterialTile } from '@/features/materials/components/MaterialTile';
import { importFiles, type ImportProgress } from '@/features/materials/importMaterials';
import {
  MATERIAL_SECTIONS,
  sectionForType,
  typesForSection,
  type MaterialSection,
} from '@/features/materials/types';
import { pickMediaFiles } from '@/lib/media';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

type SortValue = NonNullable<MaterialFilters['sort']>;

const MIN_TILE_WIDTH = 180;

export default function MaterialsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [section, setSection] = useState<MaterialSection>('video');
  const [search, setSearch] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortValue>('created_desc');
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const tags = useDbQuery((database) => listTags(database), []);
  const materials = useDbQuery(
    (database) =>
      listMaterials(database, {
        search,
        types: typesForSection(section),
        tagIds,
        sort,
      }),
    [section, search, tagIds.join(','), sort],
  );

  const isAudio = section === 'audio';
  const columns = isAudio
    ? 1
    : Math.max(2, Math.floor((width - theme.spacing.lg * 2) / MIN_TILE_WIDTH));
  const gap = theme.spacing.md;
  const tileWidth = (width - theme.spacing.lg * 2 - gap * (columns - 1)) / columns;

  async function handlePickFiles() {
    const files = await pickMediaFiles(true).catch(() => {
      Alert.alert(
        'Не удалось открыть выбор файлов',
        'Попробуйте ещё раз. Если не помогает — закройте и откройте приложение.',
      );
      return [];
    });
    if (files.length === 0) return;

    setProgress({ current: 0, total: files.length, title: '' });
    try {
      const { imported, failed } = await importFiles(db, files, setProgress);
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

  return (
    <Screen>
      <FlatList
        key={`${section}-${columns}`}
        data={materials}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={columns > 1 ? { gap } : undefined}
        contentContainerStyle={{
          gap: isAudio ? theme.spacing.sm : gap,
          paddingBottom: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
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

            <SegmentedControl
              value={sort}
              onChange={setSort}
              options={[
                { value: 'created_desc', label: 'Новые' },
                { value: 'created_asc', label: 'Старые' },
                { value: 'size_desc', label: 'Тяжёлые' },
                { value: 'title_asc', label: 'По алфавиту' },
              ]}
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
                    Копирую {progress.current} из {progress.total}
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
        renderItem={({ item }) =>
          isAudio ? (
            <AudioRow material={item} onPress={() => router.push(`/material/${item.id}`)} />
          ) : (
            <MaterialTile
              material={item}
              width={tileWidth}
              onPress={() => router.push(`/material/${item.id}`)}
            />
          )
        }
      />

      <View
        style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingBottom: theme.spacing.lg }}
      >
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
      </View>
    </Screen>
  );
}
