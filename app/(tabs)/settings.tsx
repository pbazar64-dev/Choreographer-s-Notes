import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { getTotalMaterialsSize, listMaterials } from '@/db/repositories/materials.repo';
import { getNumberSetting, SETTINGS_KEYS } from '@/db/repositories/settings.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import {
  BACKUP_STEP_LABELS,
  exportBackup,
  importBackup,
  pickBackupArchive,
  type BackupStep,
} from '@/features/backup/backup';
import { BACKUP_REMINDER_DAYS, daysSinceBackup } from '@/features/backup/manifest';
import { saveFontScale, saveThemePreference } from '@/features/settings/preferences';
import { formatFullDate } from '@/lib/date';
import { formatBytes } from '@/lib/mediaTypes';
import { bumpDbRevision } from '@/stores/dbRevision';
import { FONT_SCALES, useUiPrefs, type FontScale, type ThemePreference } from '@/stores/uiPrefs';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Screen, Text } from '@/ui';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

const FONT_LABELS: Record<FontScale, string> = {
  1: 'Обычный',
  1.15: 'Крупный',
  1.3: 'Очень крупный',
};

export default function SettingsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();

  const themePreference = useUiPrefs((state) => state.themePreference);
  const fontScale = useUiPrefs((state) => state.lessonFontScale);

  const [step, setStep] = useState<BackupStep | null>(null);

  const backupInfo = useDbQuery((database) => {
    const lastBackupAt = getNumberSetting(database, SETTINGS_KEYS.lastBackupAt);
    return { lastBackupAt, daysAgo: daysSinceBackup(lastBackupAt, Date.now()) };
  }, []);
  const totalSize = useDbQuery((database) => getTotalMaterialsSize(database), []);
  const heaviest = useDbQuery(
    (database) => listMaterials(database, { sort: 'size_desc' }).slice(0, 5),
    [],
  );
  const materialsCount = useDbQuery((database) => listMaterials(database).length, []);

  const { lastBackupAt, daysAgo } = backupInfo;

  async function handleExport() {
    try {
      await exportBackup(setStep);
      bumpDbRevision();
    } catch (error) {
      Alert.alert('Не удалось создать копию', String(error));
    } finally {
      setStep(null);
    }
  }

  async function handleImport() {
    const uri = await pickBackupArchive();
    if (!uri) return;

    Alert.alert(
      'Восстановить из копии?',
      'Все текущие конспекты, материалы и настройки будут заменены содержимым архива. Отменить это действие нельзя.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Восстановить',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await importBackup(uri, setStep);
              bumpDbRevision();

              Alert.alert(
                result.restored ? 'Данные восстановлены' : 'Восстановить не удалось',
                result.restored
                  ? 'Конспекты и материалы на месте. Закройте и откройте приложение, чтобы всё перечиталось наверняка.'
                  : (result.reason ?? 'Архив не подошёл.'),
              );
            } catch (error) {
              Alert.alert('Не удалось восстановить', String(error));
            } finally {
              setStep(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}
      >
        <Card>
          <Text variant="subtitle">Резервная копия</Text>
          <Text tone="muted">
            База и все файлы материалов складываются в один .zip. Данные лежат в приватной папке
            приложения: удаление приложения стирает их полностью, восстановить их можно только из
            такой копии.
          </Text>

          <Text
            variant="caption"
            tone={daysAgo === null || daysAgo >= BACKUP_REMINDER_DAYS ? 'danger' : 'muted'}
            style={{ paddingTop: theme.spacing.xs }}
          >
            {lastBackupAt
              ? `Последняя копия: ${formatFullDate(new Date(lastBackupAt).toISOString().slice(0, 10))}${
                  daysAgo !== null ? ` (${daysAgo} дн. назад)` : ''
                }`
              : 'Копию ещё ни разу не делали'}
          </Text>

          {step ? (
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: theme.spacing.sm,
                paddingTop: theme.spacing.sm,
              }}
            >
              <ActivityIndicator color={theme.colors.accent} />
              <Text variant="label">{BACKUP_STEP_LABELS[step]}…</Text>
            </View>
          ) : (
            <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
              <Button title="Создать копию" onPress={handleExport} />
              <Button title="Восстановить из копии" variant="secondary" onPress={handleImport} />
            </View>
          )}
        </Card>

        <Card>
          <Text variant="subtitle">Место на планшете</Text>
          <Text tone="muted">
            {materialsCount} материалов · {formatBytes(totalSize)}
          </Text>

          {heaviest.length > 0 ? (
            <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm }}>
              <Text variant="label" tone="muted">
                Самые тяжёлые
              </Text>
              {heaviest.map((material) => (
                <Text
                  key={material.id}
                  variant="caption"
                  tone="accent"
                  numberOfLines={1}
                  onPress={() => router.push(`/material/${material.id}`)}
                >
                  {material.title} — {formatBytes(material.fileSizeBytes)}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <Card onPress={() => router.push('/templates')}>
          <Text variant="subtitle">Шаблоны уроков</Text>
          <Text tone="muted">
            Готовые структуры занятия: у детей и у взрослых логика урока разная.
          </Text>
        </Card>

        <Card>
          <Text variant="subtitle">Тема оформления</Text>
          <View
            style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant={themePreference === option.value ? 'primary' : 'secondary'}
                onPress={() => saveThemePreference(db, option.value)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text variant="subtitle">Размер шрифта конспекта</Text>
          <Text tone="muted">Тексты урока читаются с полутора метров.</Text>
          <View
            style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            {FONT_SCALES.map((scale) => (
              <Button
                key={scale}
                title={FONT_LABELS[scale]}
                variant={fontScale === scale ? 'primary' : 'secondary'}
                onPress={() => saveFontScale(db, scale)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          <Text scaled style={{ paddingTop: theme.spacing.md }}>
            Так будет выглядеть текст блока в конспекте и в режиме урока.
          </Text>
        </Card>

        <Card>
          <Text variant="subtitle">О приложении</Text>
          <Text tone="muted">
            Версия {Constants.expoConfig?.version ?? '1.0.0'} · сборка{' '}
            {Constants.expoConfig?.android?.versionCode ?? 1}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
