import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function Badge({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color ?? theme.colors.surfaceMuted,
        borderRadius: theme.radii.pill,
        paddingHorizontal: theme.spacing.md - 2,
        paddingVertical: 3,
      }}
    >
      <Text variant="caption" tone={color ? 'inverse' : 'muted'}>
        {label}
      </Text>
    </View>
  );
}
