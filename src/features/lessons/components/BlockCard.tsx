import { Pressable, View } from 'react-native';

import { blockKindLabel } from '@/constants/blockKinds';
import type { BlockMaterialItem, BlockWithMaterials } from '@/db/repositories/blocks.repo';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Badge, Card, Text } from '@/ui';

import { MaterialStrip } from './MaterialStrip';

export function BlockCard({
  block,
  index,
  onPress,
  onLongPress,
  onAddMaterial,
  onOpenMaterial,
  isActive = false,
}: {
  block: BlockWithMaterials;
  index: number;
  onPress: () => void;
  onLongPress?: () => void;
  onAddMaterial: () => void;
  onOpenMaterial: (item: BlockMaterialItem) => void;
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

        <MaterialStrip items={block.materials} onPressItem={onOpenMaterial} />

        <Button
          title={block.materials.length > 0 ? 'Добавить материал' : 'Добавить видео или музыку'}
          variant="ghost"
          onPress={onAddMaterial}
          style={{ alignSelf: 'flex-start', marginTop: theme.spacing.xs }}
        />
      </Card>
    </Pressable>
  );
}
