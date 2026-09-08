import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { Material } from '@/db/schema';
import { toAbsoluteUri } from '@/lib/files';
import { formatDuration } from '@/lib/lessonTime';
import { linkSourceLabel } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import { isAudioMaterial, isLinkMaterial } from '../types';

/** Плитка материала в сетке: кадр видео, длительность, бейдж источника у ссылок. */
export function MaterialTile({
  material,
  width,
  selected,
  onPress,
  onLongPress,
}: {
  material: Material;
  width: number;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const audio = isAudioMaterial(material.type);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={material.title}
      accessibilityState={{ selected: Boolean(selected) }}
      style={{ width }}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderRadius: theme.radii.md,
          borderWidth: selected ? 3 : 1,
          height: width * 0.62,
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        {material.thumbnailPath ? (
          <Image
            source={{ uri: toAbsoluteUri(material.thumbnailPath) }}
            style={{ height: '100%', position: 'absolute', width: '100%' }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            <Text variant="caption" tone="muted">
              {audio ? 'аудио' : isLinkMaterial(material.type) ? 'ссылка' : 'без превью'}
            </Text>
          </View>
        )}

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: theme.spacing.xs,
            justifyContent: 'space-between',
            padding: theme.spacing.xs,
          }}
        >
          {isLinkMaterial(material.type) && material.url ? (
            <Chip label={linkSourceLabel(material.url)} />
          ) : (
            <View />
          )}
          {material.durationSec ? <Chip label={formatDuration(material.durationSec)} /> : null}
        </View>
      </View>

      <Text variant="caption" numberOfLines={2} style={{ paddingTop: theme.spacing.xs }}>
        {material.title}
      </Text>
    </Pressable>
  );
}

function Chip({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.overlay,
        borderRadius: theme.radii.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" style={{ color: '#FFFFFF' }}>
        {label}
      </Text>
    </View>
  );
}
