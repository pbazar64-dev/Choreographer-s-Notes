import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Linking, View } from 'react-native';

import type { Material } from '@/db/schema';
import { toAbsoluteUri } from '@/lib/files';
import { formatDuration } from '@/lib/lessonTime';
import { linkSourceLabel } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/ui';

import { isAudioMaterial, isLinkMaterial } from '../types';

/**
 * Плеер материала. Файлы играются внутри приложения, ссылки открываются
 * во внешнем приложении: YouTube и VK во встроенном плеере не работают.
 */
export function MaterialPlayer({
  material,
  startTimeSec,
}: {
  material: Material;
  startTimeSec?: number | null;
}) {
  if (isLinkMaterial(material.type)) {
    return <LinkPlayer material={material} />;
  }

  if (material.type === 'image') {
    return <ImageViewer material={material} />;
  }

  if (isAudioMaterial(material.type)) {
    return <AudioPlayerView material={material} startTimeSec={startTimeSec} />;
  }

  return <VideoPlayerView material={material} startTimeSec={startTimeSec} />;
}

function VideoPlayerView({
  material,
  startTimeSec,
}: {
  material: Material;
  startTimeSec?: number | null;
}) {
  const theme = useTheme();
  const source = material.localPath ? toAbsoluteUri(material.localPath) : null;

  const player = useVideoPlayer(source ? { uri: source } : null, (instance) => {
    if (startTimeSec) instance.currentTime = startTimeSec;
  });

  if (!source) return <MissingFile />;

  return (
    <VideoView
      player={player}
      style={{
        aspectRatio: 16 / 9,
        backgroundColor: '#000000',
        borderRadius: theme.radii.md,
        width: '100%',
      }}
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      nativeControls
    />
  );
}

function AudioPlayerView({
  material,
  startTimeSec,
}: {
  material: Material;
  startTimeSec?: number | null;
}) {
  const theme = useTheme();
  const source = material.localPath ? toAbsoluteUri(material.localPath) : null;
  const player = useAudioPlayer(source ? { uri: source } : null);
  const status = useAudioPlayerStatus(player);

  if (!source) return <MissingFile />;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Button
        title={status.playing ? 'Пауза' : 'Слушать'}
        large
        onPress={() => {
          if (status.playing) {
            player.pause();
            return;
          }
          if (startTimeSec && player.currentTime < 0.1) {
            player.seekTo(startTimeSec);
          }
          player.play();
        }}
      />
      <Text variant="caption" tone="muted">
        {formatDuration(Math.floor(status.currentTime))} из{' '}
        {formatDuration(Math.floor(status.duration || material.durationSec || 0))}
      </Text>
    </View>
  );
}

function ImageViewer({ material }: { material: Material }) {
  const theme = useTheme();
  if (!material.localPath) return <MissingFile />;

  return (
    <Image
      source={{ uri: toAbsoluteUri(material.localPath) }}
      style={{
        aspectRatio: 4 / 3,
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radii.md,
        width: '100%',
      }}
      contentFit="contain"
    />
  );
}

function LinkPlayer({ material }: { material: Material }) {
  const theme = useTheme();
  if (!material.url) return <MissingFile />;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Button
        title={`Открыть в ${linkSourceLabel(material.url)}`}
        large
        onPress={() => material.url && Linking.openURL(material.url)}
      />
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {material.url}
      </Text>
    </View>
  );
}

function MissingFile() {
  return (
    <Text tone="danger">
      Файл материала не найден. Возможно, он был удалён вместе с приложением или не восстановился из
      резервной копии.
    </Text>
  );
}
