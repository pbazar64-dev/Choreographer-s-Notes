import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { getBlock } from '@/db/repositories/blocks.repo';
import { attachMaterialsToBlock, listMaterials, listTags } from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { MaterialFilters } from '@/features/materials/components/MaterialFilters';
import { MaterialTile } from '@/features/materials/components/MaterialTile';
import {
  createLinkMaterial,
  importFiles,
  type ImportProgress,
} from '@/features/materials/importMaterials';
import { typesForFilters, type MaterialFilterCode } from '@/features/materials/types';
import { useLinkTitle } from '@/features/materials/useLinkTitle';
import { linkSourceLabel, pickMediaFiles } from '@/lib/media';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, SegmentedControl, Text, TextField } from '@/ui';

const MIN_TILE_WIDTH = 160;

export default function AttachMaterialScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ lessonId: string; blockId: string }>();
  const blockId = Number(params.blockId);

  const [tab, setTab] = useState<'library' | 'new'>('library');
  const block = useDbQuery((database) => getBlock(database, blockId), [blockId]);

  return (
    <Screen>
      <Stack.Screen options={{ title: block ? `Материалы: ${block.title}` : 'Материалы' }} />

      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.lg, flex: 1 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'library', label: 'Из базы' },
            { value: 'new', label: 'Добавить новое' },
          ]}
        />

        {tab === 'library' ? (
          <LibraryTab blockId={blockId} />
        ) : (
          <NewMaterialTab blockId={blockId} />
        )}
      </View>
    </Screen>
  );
}

function LibraryTab({ blockId }: { blockId: number }) {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<MaterialFilterCode[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const tags = useDbQuery((database) => listTags(database), []);
  const materials = useDbQuery(
    (database) => listMaterials(database, { search, types: typesForFilters(typeFilters), tagIds }),
    [search, typeFilters.join(','), tagIds.join(',')],
  );

  const columns = Math.max(2, Math.floor(width / MIN_TILE_WIDTH) - 1);
  const gap = theme.spacing.sm;
  const tileWidth = (width - theme.spacing.lg * 2 - gap * (columns - 1)) / columns;

  function toggleSelected(materialId: number) {
    setSelected((current) =>
      current.includes(materialId)
        ? current.filter((id) => id !== materialId)
        : [...current, materialId],
    );
  }

  function handleAttach() {
    attachMaterialsToBlock(db, blockId, selected);
    bumpDbRevision();
    router.back();
  }

  return (
    <>
      <FlatList
        key={columns}
        data={materials}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={columns > 1 ? { gap } : undefined}
        contentContainerStyle={{ gap, paddingBottom: theme.spacing.lg }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск по названию"
              returnKeyType="search"
            />
            <MaterialFilters
              activeTypes={typeFilters}
              onToggleType={(code) =>
                setTypeFilters((current) =>
                  current.includes(code)
                    ? current.filter((item) => item !== code)
                    : [...current, code],
                )
              }
              tags={tags}
              activeTagIds={tagIds}
              onToggleTag={(tagId) =>
                setTagIds((current) =>
                  current.includes(tagId)
                    ? current.filter((item) => item !== tagId)
                    : [...current, tagId],
                )
              }
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Ничего не найдено"
            description="Добавьте материал на вкладке «Добавить новое» — он попадёт и в блок, и в общую базу."
          />
        }
        renderItem={({ item }) => (
          <MaterialTile
            material={item}
            width={tileWidth}
            selected={selected.includes(item.id)}
            onPress={() => toggleSelected(item.id)}
          />
        )}
      />

      <View style={{ paddingBottom: theme.spacing.lg }}>
        <Button
          title={selected.length > 0 ? `Прикрепить (${selected.length})` : 'Выберите материалы'}
          disabled={selected.length === 0}
          onPress={handleAttach}
        />
      </View>
    </>
  );
}

function NewMaterialTab({ blockId }: { blockId: number }) {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();

  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [url, setUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState<'video_link' | 'audio_link'>('video_link');
  const [linkError, setLinkError] = useState<string | undefined>();

  const handleTitleResolved = useCallback((resolved: string) => {
    setLinkTitle(resolved);
    setLinkError(undefined);
  }, []);

  const { loading: titleLoading } = useLinkTitle({
    url,
    title: linkTitle,
    onTitleResolved: handleTitleResolved,
  });

  /**
   * Новый материал одновременно прикрепляется к блоку и попадает в общую базу —
   * это требование ТЗ, а не побочный эффект.
   */
  async function importAndAttach(files: Awaited<ReturnType<typeof pickMediaFiles>>) {
    if (files.length === 0) return;

    setProgress({ current: 0, total: files.length, title: '' });
    try {
      const { imported, failed } = await importFiles(db, files, setProgress);
      attachMaterialsToBlock(
        db,
        blockId,
        imported.map((material) => material.id),
      );
      bumpDbRevision();

      if (failed.length > 0) {
        Alert.alert(
          'Часть файлов не добавилась',
          `Прикреплено: ${imported.length}. Не удалось: ${failed.join(', ')}`,
        );
      }

      if (imported.length > 0) router.back();
    } finally {
      setProgress(null);
    }
  }

  function handleAddLink() {
    const trimmedUrl = url.trim();
    const trimmedTitle = linkTitle.trim();

    if (!/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      setLinkError('Ссылка должна начинаться с http:// или https://');
      return;
    }
    if (!trimmedTitle) {
      setLinkError('Укажите название');
      return;
    }

    const material = createLinkMaterial(db, {
      url: trimmedUrl,
      title: trimmedTitle,
      type: linkType,
    });
    attachMaterialsToBlock(db, blockId, [material.id]);
    bumpDbRevision();
    router.back();
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={32}
      contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="caption" tone="muted">
        Новый материал попадёт и в этот блок, и в общую базу материалов — потом его можно будет
        выбрать в любом другом уроке.
      </Text>

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

      <Button
        title="Выбрать файлы"
        disabled={progress !== null}
        onPress={async () => importAndAttach(await pickMediaFiles(true))}
      />

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="subtitle">Или вставьте ссылку</Text>

        <TextField
          label="Ссылка"
          value={url}
          onChangeText={(value) => {
            setUrl(value);
            setLinkError(undefined);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {url.trim() ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm }}>
            {titleLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
            <Text variant="caption" tone="muted">
              Источник: {linkSourceLabel(url.trim())}
              {titleLoading ? ' · определяю название…' : ''}
            </Text>
          </View>
        ) : null}

        <TextField
          label="Название"
          value={linkTitle}
          onChangeText={(value) => {
            setLinkTitle(value);
            setLinkError(undefined);
          }}
          placeholder="Комбинация: связка на 8 счётов"
          error={linkError}
        />

        <SegmentedControl
          value={linkType}
          onChange={setLinkType}
          options={[
            { value: 'video_link', label: 'Видео' },
            { value: 'audio_link', label: 'Музыка' },
          ]}
        />

        <Button title="Прикрепить ссылку" onPress={handleAddLink} disabled={progress !== null} />
      </View>
    </KeyboardAwareScrollView>
  );
}
