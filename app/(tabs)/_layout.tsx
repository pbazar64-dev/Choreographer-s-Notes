import { Tabs } from 'expo-router';
import { Pressable, type GestureResponderEvent } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

/**
 * Кнопки вкладок рисуем сами: у навигации подпись прижимается к низу
 * (резервируется место под иконку), а текст, отданный вместо иконки,
 * обрезается до одной буквы — иконке задан фиксированный маленький размер.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Календарь', tabBarButton: tabButton('Календарь') }}
      />
      <Tabs.Screen name="groups" options={{ title: 'Группы', tabBarButton: tabButton('Группы') }} />
      <Tabs.Screen
        name="materials"
        options={{ title: 'Материалы', tabBarButton: tabButton('Материалы') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Настройки', tabBarButton: tabButton('Настройки') }}
      />
    </Tabs>
  );
}

type TabButtonProps = {
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
};

function tabButton(title: string) {
  return function TabButton({ accessibilityState, onPress, testID }: TabButtonProps) {
    const theme = useTheme();
    const selected = Boolean(accessibilityState?.selected);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        testID={testID}
        onPress={onPress}
        style={{
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.xs,
        }}
      >
        <Text
          variant="label"
          numberOfLines={1}
          style={{ color: selected ? theme.colors.accent : theme.colors.textMuted }}
        >
          {title}
        </Text>
      </Pressable>
    );
  };
}
