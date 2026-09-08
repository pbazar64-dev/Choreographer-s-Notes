import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { WIDE_LAYOUT_BREAKPOINT } from '@/theme/tokens';

export function useWideLayout(): boolean {
  const { width } = useWindowDimensions();
  return width >= WIDE_LAYOUT_BREAKPOINT;
}

/**
 * Двухпанельный режим для планшета: слева список, справа содержимое.
 * На узком экране правая панель не рендерится — работает обычная навигация.
 */
export function TwoPane({ list, detail }: { list: ReactNode; detail: ReactNode }) {
  const theme = useTheme();
  const wide = useWideLayout();

  if (!wide) return <>{list}</>;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 2, minWidth: 280 }}>{list}</View>
      <View
        style={{
          borderLeftColor: theme.colors.border,
          borderLeftWidth: 1,
          flex: 3,
          paddingLeft: theme.spacing.lg,
        }}
      >
        {detail}
      </View>
    </View>
  );
}
