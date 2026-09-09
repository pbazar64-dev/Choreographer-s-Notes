import { Pressable, View } from 'react-native';

import { blockKindLabel } from '@/constants/blockKinds';
import type { BlockMaterialItem, BlockWithMaterials } from '@/db/repositories/blocks.repo';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/ui';

import { MaterialStrip } from './MaterialStrip';

export function BlockCard({
  block,
  index,
  onPress,
  onAddMaterial,
  onOpenMaterial,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: BlockWithMaterials;
  index: number;
  onPress: () => void;
  onAddMaterial: () => void;
  onOpenMaterial: (item: BlockMaterialItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const theme = useTheme();

  return (
    <Card>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={block.title}>
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
      </Pressable>

      <MaterialStrip items={block.materials} onPressItem={onOpenMaterial} />

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
        }}
      >
        <Button
          title={block.materials.length > 0 ? 'Ещё материал' : 'Видео или музыка'}
          variant="secondary"
          onPress={onAddMaterial}
          style={{ flex: 1 }}
        />
        <Button
          title="Выше"
          variant="secondary"
          onPress={onMoveUp}
          disabled={!canMoveUp}
          accessibilityLabel="Переместить блок выше"
        />
        <Button
          title="Ниже"
          variant="secondary"
          onPress={onMoveDown}
          disabled={!canMoveDown}
          accessibilityLabel="Переместить блок ниже"
        />
      </View>
    </Card>
  );
}
