import { Pressable, View } from 'react-native';

import type { Material } from '@/db/schema';
import { formatDuration } from '@/lib/lessonTime';
import { linkSourceLabel } from '@/lib/mediaTypes';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import { isLinkMaterial } from '../types';

/** Аудио — строкой: нота, исполнитель с названием, длительность. Плитка здесь ни к чему. */
export function AudioRow({
  material,
  selected,
  onPress,
}: {
  material: Material;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={material.title}
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderRadius: theme.radii.md,
        borderWidth: selected ? 2 : 1,
        flexDirection: 'row',
        gap: theme.spacing.md,
        minHeight: 56,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      })}
    >
      <Text variant="subtitle" tone="muted">
        ♪
      </Text>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1}>{material.title}</Text>
        {material.durationSec || isLinkMaterial(material.type) ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {material.durationSec ? formatDuration(material.durationSec) : ''}
            {material.durationSec && isLinkMaterial(material.type) ? ' · ' : ''}
            {isLinkMaterial(material.type) && material.url ? linkSourceLabel(material.url) : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
