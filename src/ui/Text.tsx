import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyVariant } from '@/theme/tokens';

type Tone = 'default' | 'muted' | 'accent' | 'danger' | 'inverse';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Применить пользовательский масштаб шрифта конспекта */
  scaled?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'default',
  scaled = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const base = theme.typography[variant];
  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    accent: theme.colors.accent,
    danger: theme.colors.danger,
    inverse: theme.colors.textInverse,
  }[tone];
  const scale = scaled ? theme.fontScale : 1;

  return (
    <RNText
      {...rest}
      style={[
        {
          color,
          fontSize: base.fontSize * scale,
          lineHeight: base.lineHeight * scale,
          fontWeight: base.fontWeight,
        },
        style,
      ]}
    />
  );
}
