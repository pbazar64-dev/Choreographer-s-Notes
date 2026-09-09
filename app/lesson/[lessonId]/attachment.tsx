import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import {
  detachMaterialFromBlock,
  getBlockMaterial,
  updateBlockMaterial,
} from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { formatDuration } from '@/lib/lessonTime';
import { formatTimecode, parseTimecode } from '@/lib/timecode';
import { bumpDbRevision } from '@/stores/dbRevision';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, EmptyState, Screen, Text, TextField } from '@/ui';

/** Комментарий к связке и таймкод — настройки того, КАК материал используется в этом блоке. */
export default function AttachmentScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ blockMaterialId: string }>();
  const blockMaterialId = Number(params.blockMaterialId);

  const attachment = useDbQuery(
    (database) => getBlockMaterial(database, blockMaterialId),
    [blockMaterialId],
  );

  const [comment, setComment] = useState(attachment?.comment ?? '');
  const [timecode, setTimecode] = useState(
    attachment?.startTimeSec != null ? formatTimecode(attachment.startTimeSec) : '',
  );
  const [error, setError] = useState<string | undefined>();

  if (!attachment) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Материал в блоке' }} />
        <EmptyState title="Материал уже откреплён" />
      </Screen>
    );
  }

  function handleSave() {
    const trimmed = timecode.trim();
    const parsed = trimmed ? parseTimecode(trimmed) : null;

    if (trimmed && parsed === null) {
      setError('Таймкод в формате М:СС, например 1:30');
      return;
    }

    if (
      parsed !== null &&
      attachment?.material.durationSec &&
      parsed > attachment.material.durationSec
    ) {
      setError(`Таймкод больше длительности (${formatDuration(attachment.material.durationSec)})`);
      return;
    }

    updateBlockMaterial(db, blockMaterialId, { comment: comment.trim(), startTimeSec: parsed });
    bumpDbRevision();
    router.back();
  }

  function handleDetach() {
    Alert.alert(
      'Открепить материал?',
      'Материал исчезнет из этого блока, но останется в общей базе и в других уроках.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Открепить',
          style: 'destructive',
          onPress: () => {
            detachMaterialFromBlock(db, blockMaterialId);
            bumpDbRevision();
            router.back();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: attachment.material.title }} />

      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Комментарий"
          value={comment}
          onChangeText={setComment}
          placeholder="Берём только первые 30 секунд, медленнее в 2 раза"
          multiline
        />

        <TextField
          label="Открывать с таймкода (М:СС)"
          value={timecode}
          onChangeText={(value) => {
            setTimecode(value);
            setError(undefined);
          }}
          placeholder="1:30"
          keyboardType="numbers-and-punctuation"
          error={error}
        />

        {attachment.material.durationSec ? (
          <Text variant="caption" tone="muted">
            Длительность материала: {formatDuration(attachment.material.durationSec)}
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="Сохранить" onPress={handleSave} />
          <Button title="Отмена" variant="secondary" onPress={() => router.back()} />
          <Button title="Открепить от блока" variant="danger" onPress={handleDetach} />
        </View>

        <Text variant="caption" tone="muted">
          Комментарий и таймкод относятся только к этому блоку. В других уроках тот же материал
          останется со своими настройками.
        </Text>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
