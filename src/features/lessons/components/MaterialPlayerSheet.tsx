import { Modal, ScrollView, View } from 'react-native';

import type { BlockMaterialItem } from '@/db/repositories/blocks.repo';
import { MaterialPlayer } from '@/features/materials/components/MaterialPlayer';
import { formatTimecode } from '@/lib/timecode';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/ui';

/**
 * Плеер поверх конспекта: тап по превью открывает материал сразу,
 * не уводя с экрана урока (п. 4.3 ТЗ).
 */
export function MaterialPlayerSheet({
  item,
  onClose,
  onEdit,
  autoPlay = false,
}: {
  item: BlockMaterialItem | null;
  onClose: () => void;
  onEdit?: (item: BlockMaterialItem) => void;
  autoPlay?: boolean;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={item !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ backgroundColor: theme.colors.overlay, flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            maxHeight: '90%',
            padding: theme.spacing.lg,
          }}
        >
          {item ? (
            <ScrollView contentContainerStyle={{ gap: theme.spacing.md }}>
              <Text variant="subtitle">{item.material.title}</Text>

              <MaterialPlayer
                material={item.material}
                startTimeSec={item.startTimeSec}
                autoPlay={autoPlay}
              />

              {item.startTimeSec != null ? (
                <Text variant="caption" tone="muted">
                  Открыто с таймкода {formatTimecode(item.startTimeSec)}
                </Text>
              ) : null}

              {item.comment.trim() ? <Text scaled>{item.comment.trim()}</Text> : null}

              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                {onEdit ? (
                  <Button
                    title="Комментарий и таймкод"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => onEdit(item)}
                  />
                ) : null}
                <Button title="Закрыть" style={{ flex: 1 }} onPress={onClose} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
