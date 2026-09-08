import { Pressable, View } from 'react-native';

import { BLOCK_KINDS } from '@/constants/blockKinds';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';
import { Text } from '@/ui';

/** Справочник видов блока. «Свободный» — вариант для своего названия в заголовке. */
export function KindPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (kind: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" tone="muted">
        Вид блока
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {BLOCK_KINDS.map((kind) => {
          const selected = kind.code === value;
          return (
            <Pressable
              key={kind.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(kind.code)}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                justifyContent: 'center',
                minHeight: HIT_SIZE,
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              <Text variant="label" tone={selected ? 'inverse' : 'default'}>
                {kind.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
