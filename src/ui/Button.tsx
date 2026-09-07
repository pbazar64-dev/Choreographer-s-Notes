import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { HIT_SIZE } from '@/theme/tokens';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Крупная кнопка для режима урока */
  large?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  large = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();

  const background = {
    primary: theme.colors.accent,
    secondary: theme.colors.surfaceMuted,
    ghost: 'transparent',
    danger: theme.colors.dangerMuted,
  }[variant];

  const tone = {
    primary: 'inverse',
    secondary: 'default',
    ghost: 'accent',
    danger: 'danger',
  }[variant] as 'inverse' | 'default' | 'accent' | 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderRadius: theme.radii.md,
          paddingHorizontal: large ? theme.spacing.xl : theme.spacing.lg,
          minHeight: large ? 72 : HIT_SIZE,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <View style={styles.content}>
          <Text variant={large ? 'subtitle' : 'label'} tone={tone} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
