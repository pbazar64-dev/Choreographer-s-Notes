import { Pressable, View } from 'react-native';

import { GROUP_COLORS } from '@/constants/groupColors';
import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';
import { Text } from '@/ui';

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" tone="muted">
        Цвет группы
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {GROUP_COLORS.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Цвет ${color}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(color)}
              style={{
                alignItems: 'center',
                height: HIT_SIZE,
                justifyContent: 'center',
                width: HIT_SIZE,
              }}
            >
              <View
                style={{
                  backgroundColor: color,
                  borderColor: selected ? theme.colors.text : 'transparent',
                  borderRadius: theme.radii.pill,
                  borderWidth: selected ? 3 : 0,
                  height: 36,
                  width: 36,
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
