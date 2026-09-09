import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

/**
 * Подписи вкладок рисуются как «иконки»: обычный лейбл прижимается к низу,
 * потому что React Navigation резервирует место под иконку, а иконок у нас нет.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
        },
        tabBarItemStyle: { alignItems: 'center', justifyContent: 'center' },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Календарь', tabBarIcon: tabLabel('Календарь') }}
      />
      <Tabs.Screen name="groups" options={{ title: 'Группы', tabBarIcon: tabLabel('Группы') }} />
      <Tabs.Screen
        name="materials"
        options={{ title: 'Материалы', tabBarIcon: tabLabel('Материалы') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Настройки', tabBarIcon: tabLabel('Настройки') }}
      />
    </Tabs>
  );
}

function tabLabel(title: string) {
  return function TabLabel({ color }: { color: ColorValue }) {
    return (
      <Text variant="label" numberOfLines={1} style={{ color }}>
        {title}
      </Text>
    );
  };
}
