import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listBlocksWithMaterials, type BlockMaterialItem } from '@/db/repositories/blocks.repo';
import { getLesson, setLessonStatus } from '@/db/repositories/lessons.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { MaterialPlayerSheet } from '@/features/lessons/components/MaterialPlayerSheet';
import { lessonElapsedSec } from '@/features/session/timer';
import { useSessionTimer } from '@/features/session/useSessionTimer';
import { isAudioMaterial, isLinkMaterial } from '@/features/materials/types';
import { formatDuration } from '@/lib/lessonTime';
import { formatTimecode } from '@/lib/timecode';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text } from '@/ui';

/** Режим проведения урока: планшет стоит у зеркала в паре метров от педагога. */
export default function RunLessonScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);

  useKeepAwake();

  const lesson = useDbQuery((database) => getLesson(database, lessonId), [lessonId]);
  const blocks = useDbQuery((database) => listBlocksWithMaterials(database, lessonId), [lessonId]);

  const [index, setIndex] = useState(0);
  const [openedMaterial, setOpenedMaterial] = useState<BlockMaterialItem | null>(null);
  const startedAtRef = useRef(Date.now());

  const currentBlock = blocks[Math.min(index, Math.max(0, blocks.length - 1))];
  const timer = useSessionTimer(currentBlock?.id ?? null, currentBlock?.plannedMinutes ?? 0);

  // Аппаратная кнопка «Назад» не должна ронять урок в один тап.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmExit();
      return true;
    });

    return () => subscription.remove();
  });

  function confirmExit() {
    Alert.alert('Завершить урок?', 'Таймер остановится, конспект останется на месте.', [
      { text: 'Продолжить урок', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  function finishLesson() {
    Alert.alert('Урок закончен?', 'Отметить конспект как проведённый.', [
      { text: 'Ещё нет', style: 'cancel' },
      {
        text: 'Отметить проведённым',
        onPress: () => {
          setLessonStatus(db, lessonId, 'done');
          bumpDbRevision();
          router.back();
        },
      },
    ]);
  }

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Конспект не найден" actionTitle="Назад" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (blocks.length === 0 || !currentBlock) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          title="В конспекте нет блоков"
          description="Добавьте блоки в конспект — по ним и идёт урок."
          actionTitle="К конспекту"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const landscape = width > height;
  const isLast = index >= blocks.length - 1;
  const lessonElapsed = lessonElapsedSec(startedAtRef.current, timer.now);
  const overtime = timer.remainingSec < 0;

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          alignItems: 'center',
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: theme.spacing.md,
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <Text variant="label" tone="muted">
          Блок {index + 1} из {blocks.length} · {lesson.groupName}
        </Text>
        <Text variant="label" tone="muted">
          Урок идёт {formatDuration(lessonElapsed)}
        </Text>
        <Button title="Выйти" variant="ghost" onPress={confirmExit} />
      </View>

      <View style={{ flex: 1, flexDirection: landscape ? 'row' : 'column' }}>
        <ScrollView
          style={{ flex: landscape ? 2 : 1 }}
          contentContainerStyle={{ gap: theme.spacing.md, padding: theme.spacing.lg }}
        >
          <Text variant="display" scaled>
            {currentBlock.title}
          </Text>

          {currentBlock.notes.trim() ? (
            <Text variant="subtitle" scaled tone="muted">
              {currentBlock.notes.trim()}
            </Text>
          ) : null}
        </ScrollView>

        <View
          style={{
            borderLeftColor: landscape ? theme.colors.border : 'transparent',
            borderLeftWidth: landscape ? 1 : 0,
            flex: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: overtime ? theme.colors.dangerMuted : theme.colors.surfaceMuted,
              borderRadius: theme.radii.lg,
              paddingVertical: theme.spacing.lg,
            }}
          >
            <Text
              tone={overtime ? 'danger' : 'default'}
              style={{ fontSize: 64, fontWeight: '600', lineHeight: 72 }}
            >
              {formatDuration(timer.remainingSec)}
            </Text>
            <Text variant="caption" tone={overtime ? 'danger' : 'muted'}>
              {overtime
                ? 'время блока вышло'
                : `из ${currentBlock.plannedMinutes} мин · ${timer.running ? 'идёт' : 'на паузе'}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              title="− 1 мин"
              variant="secondary"
              style={{ flex: 1 }}
              large
              onPress={timer.subtractMinute}
            />
            <Button
              title={timer.running ? 'Пауза' : 'Старт'}
              style={{ flex: 2 }}
              large
              onPress={timer.toggleTimer}
            />
            <Button
              title="+ 1 мин"
              variant="secondary"
              style={{ flex: 1 }}
              large
              onPress={timer.addMinute}
            />
          </View>

          {currentBlock.materials.length > 0 ? (
            <ScrollView contentContainerStyle={{ gap: theme.spacing.sm }}>
              {currentBlock.materials.map((item) => (
                <MaterialButton key={item.id} item={item} onPress={() => setOpenedMaterial(item)} />
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              title="Предыдущий"
              variant="secondary"
              style={{ flex: 1 }}
              large
              disabled={index === 0}
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
            />
            <Button
              title={isLast ? 'Завершить' : 'Следующий'}
              style={{ flex: 1 }}
              large
              onPress={() => {
                if (isLast) {
                  finishLesson();
                  return;
                }
                setIndex((current) => Math.min(blocks.length - 1, current + 1));
              }}
            />
          </View>
        </View>
      </View>

      <MaterialPlayerSheet item={openedMaterial} autoPlay onClose={() => setOpenedMaterial(null)} />
    </SafeAreaView>
  );
}

/** Материал блока крупной кнопкой: воспроизведение в один тап. */
function MaterialButton({ item, onPress }: { item: BlockMaterialItem; onPress: () => void }) {
  const theme = useTheme();
  const { material } = item;

  const kind = isAudioMaterial(material.type)
    ? 'Музыка'
    : isLinkMaterial(material.type)
      ? 'Ссылка'
      : material.type === 'image'
        ? 'Фото'
        : 'Видео';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Включить ${material.title}`}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        gap: 2,
        minHeight: 72,
        opacity: pressed ? 0.75 : 1,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
      })}
    >
      <Text variant="caption" tone="muted">
        {kind}
        {item.startTimeSec != null ? ` · с ${formatTimecode(item.startTimeSec)}` : ''}
      </Text>
      <Text variant="subtitle" numberOfLines={1}>
        {material.title}
      </Text>
      {item.comment.trim() ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {item.comment.trim()}
        </Text>
      ) : null}
    </Pressable>
  );
}
