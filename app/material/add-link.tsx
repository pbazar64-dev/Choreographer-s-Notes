import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { useDatabase } from '@/db/useDatabase';
import { createLinkMaterial } from '@/features/materials/importMaterials';
import { useLinkTitle } from '@/features/materials/useLinkTitle';
import { linkSourceLabel } from '@/lib/media';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Screen, SegmentedControl, Text, TextField } from '@/ui';

export default function AddLinkScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video_link' | 'audio_link'>('video_link');
  const [errors, setErrors] = useState<{ url?: string; title?: string }>({});

  const handleTitleResolved = useCallback((resolved: string) => {
    setTitle(resolved);
    setErrors((prev) => ({ ...prev, title: undefined }));
  }, []);

  const { loading: titleLoading } = useLinkTitle({
    url,
    title,
    onTitleResolved: handleTitleResolved,
  });

  function handleSave() {
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    const nextErrors: typeof errors = {};

    if (!/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      nextErrors.url = 'Ссылка должна начинаться с http:// или https://';
    }
    if (!trimmedTitle) {
      nextErrors.title = 'Название обязательно';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    createLinkMaterial(db, { url: trimmedUrl, title: trimmedTitle, type });
    bumpDbRevision();
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Ссылка на материал' }} />

      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Ссылка"
          value={url}
          onChangeText={(value) => {
            setUrl(value);
            setErrors((prev) => ({ ...prev, url: undefined }));
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={errors.url}
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
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="Разминка: суставная гимнастика"
          error={errors.title}
        />

        <Text variant="caption" tone="muted">
          Название подставляется из ссылки автоматически, если сайт его отдаёт. Правьте как удобно —
          введённое вручную не перезапишется.
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="muted">
            Что по ссылке
          </Text>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: 'video_link', label: 'Видео' },
              { value: 'audio_link', label: 'Музыка' },
            ]}
          />
        </View>

        <Text variant="caption" tone="muted">
          Ссылки открываются во внешнем приложении и требуют интернета. Файлы на планшете работают в
          офлайне — для зала это надёжнее.
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
