import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export function Screen({
  children,
  padded = true,
  edges = ['top', 'bottom'],
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  edges?: readonly Edge[];
  style?: ViewStyle;
}) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.flex, padded && { paddingHorizontal: theme.spacing.lg }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
