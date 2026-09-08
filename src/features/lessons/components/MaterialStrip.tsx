import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';

import type { BlockMaterialItem } from '@/db/repositories/blocks.repo';
import { toAbsoluteUri } from '@/lib/files';
import { formatDuration } from '@/lib/lessonTime';
import { linkSourceLabel } from '@/lib/mediaTypes';
import { formatTimecode } from '@/lib/timecode';
import { isAudioMaterial, isLinkMaterial } from '@/features/materials/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

const PREVIEW_WIDTH = 148;

/**
 * Горизонтальная лента прикреплённых материалов (п. 4.3 ТЗ):
 * у видео — кадр и длительность, у аудио — нота и название, у ссылки — бейдж источника.
 */
export function MaterialStrip({
  items,
  onPressItem,
}: {
  items: readonly BlockMaterialItem[];
  onPressItem: (item: BlockMaterialItem) => void;
}) {
  const theme = useTheme();

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}
    >
      {items.map((item) => (
        <Preview key={item.id} item={item} onPress={() => onPressItem(item)} />
      ))}
    </ScrollView>
  );
}

function Preview({ item, onPress }: { item: BlockMaterialItem; onPress: () => void }) {
  const theme = useTheme();
  const { material } = item;
  const audio = isAudioMaterial(material.type);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Открыть ${material.title}`}
      style={{ width: PREVIEW_WIDTH }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.sm,
          borderWidth: 1,
          height: PREVIEW_WIDTH * 0.6,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {material.thumbnailPath ? (
          <Image
            source={{ uri: toAbsoluteUri(material.thumbnailPath) }}
            style={{ height: '100%', width: '100%' }}
            contentFit="cover"
            transition={120}
          />
        ) : audio ? (
          <Text variant="title" tone="muted">
            ♪
          </Text>
        ) : isLinkMaterial(material.type) && material.url ? (
          <Text variant="label" tone="muted">
            {linkSourceLabel(material.url)}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            без превью
          </Text>
        )}

        {material.durationSec ? (
          <View
            style={{
              backgroundColor: theme.colors.overlay,
              borderRadius: theme.radii.sm,
              bottom: 4,
              paddingHorizontal: 5,
              paddingVertical: 1,
              position: 'absolute',
              right: 4,
            }}
          >
            <Text variant="caption" style={{ color: '#FFFFFF' }}>
              {formatDuration(material.durationSec)}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="caption" numberOfLines={2} style={{ paddingTop: 2 }}>
        {material.title}
      </Text>

      {item.startTimeSec != null || item.comment.trim() ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {item.startTimeSec != null ? `с ${formatTimecode(item.startTimeSec)}` : ''}
          {item.startTimeSec != null && item.comment.trim() ? ' · ' : ''}
          {item.comment.trim()}
        </Text>
      ) : null}
    </Pressable>
  );
}
