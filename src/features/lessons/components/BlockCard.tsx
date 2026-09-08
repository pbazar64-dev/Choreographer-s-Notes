import { Pressable, View } from 'react-native';

import { blockKindLabel } from '@/constants/blockKinds';
import type { BlockWithMaterials } from '@/db/repositories/blocks.repo';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/ui';

import { formatTimecode } from '../lessonToText';

export function BlockCard({
  block,
  index,
  onPress,
  onLongPress,
  isActive = false,
}: {
  block: BlockWithMaterials;
  index: number;
  onPress: () => void;
  onLongPress?: () => void;
  isActive?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      accessibilityRole="button"
      accessibilityLabel={`Блок ${index + 1}: ${block.title}`}
      accessibilityHint="Удерживайте, чтобы перетащить"
    >
      <Card
        style={{
          borderColor: isActive ? theme.colors.accent : theme.colors.border,
          borderWidth: isActive ? 2 : undefined,
          opacity: isActive ? 0.95 : 1,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: theme.spacing.sm,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              {index + 1} · {blockKindLabel(block.kind)}
            </Text>
            <Text variant="subtitle" scaled>
              {block.title}
            </Text>
          </View>
          <Badge label={`${block.plannedMinutes} мин`} />
        </View>

        {block.notes.trim() ? (
          <Text tone="muted" scaled style={{ paddingTop: theme.spacing.xs }}>
            {block.notes.trim()}
          </Text>
        ) : null}

        {block.materials.length > 0 ? (
          <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm }}>
            {block.materials.map((item) => (
              <Text key={item.id} variant="caption" tone="muted">
                {item.material.title}
                {item.startTimeSec != null ? ` · с ${formatTimecode(item.startTimeSec)}` : ''}
                {item.comment.trim() ? ` · ${item.comment.trim()}` : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
