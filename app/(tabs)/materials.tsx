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
import { MaterialFilters as MaterialFiltersRow } from '@/features/materials/components/MaterialFilters';
import { MaterialTile } from '@/features/materials/components/MaterialTile';
import { importFiles, type ImportProgress } from '@/features/materials/importMaterials';
import { typesForFilters, type MaterialFilterCode } from '@/features/materials/types';
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

  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<MaterialFilterCode[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortValue>('created_desc');
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const tags = useDbQuery((database) => listTags(database), []);
  const materials = useDbQuery(
    (database) =>
      listMaterials(database, {
        search,
        types: typesForFilters(typeFilters),
        tagIds,
        sort,
      }),
    [search, typeFilters.join(','), tagIds.join(','), sort],
  );

  const columns = Math.max(2, Math.floor((width - theme.spacing.lg * 2) / MIN_TILE_WIDTH));
  const gap = theme.spacing.md;
  const tileWidth = (width - theme.spacing.lg * 2 - gap * (columns - 1)) / columns;

  async function runImport(files: Awaited<ReturnType<typeof pickMediaFiles>>) {
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
    } finally {
      setProgress(null);
    }
  }

  async function handlePickFiles() {
    await runImport(await pickMediaFiles(true));
  }

  function toggleType(code: MaterialFilterCode) {
    setTypeFilters((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
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
        key={columns}
        data={materials}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={columns > 1 ? { gap } : undefined}
        contentContainerStyle={{
          gap,
          paddingBottom: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
        }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск по названию материала"
              returnKeyType="search"
            />

            <MaterialFiltersRow
              activeTypes={typeFilters}
              onToggleType={toggleType}
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
            title={
              search || typeFilters.length > 0 || tagIds.length > 0
                ? 'Ничего не найдено'
                : 'База материалов пуста'
            }
            description="Видео и музыка живут здесь и подставляются в конспекты ссылками: один файл — сколько угодно уроков."
          />
        }
        renderItem={({ item }) => (
          <MaterialTile
            material={item}
            width={tileWidth}
            onPress={() => router.push(`/material/${item.id}`)}
          />
        )}
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
