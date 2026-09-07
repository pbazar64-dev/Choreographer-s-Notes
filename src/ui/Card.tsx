import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type CardProps = ViewProps & {
  onPress?: () => void;
  /** Полоска-маркер цвета группы слева */
  accentColor?: string;
  style?: ViewStyle;
};

export function Card({ onPress, accentColor, style, children, ...rest }: CardProps) {
  const theme = useTheme();

  const content = (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.xs,
        },
        style,
      ]}
    >
      {accentColor ? (
        <View
          style={[
            styles.accent,
            {
              backgroundColor: accentColor,
              borderTopLeftRadius: theme.radii.lg,
              borderBottomLeftRadius: theme.radii.lg,
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  accent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
});
