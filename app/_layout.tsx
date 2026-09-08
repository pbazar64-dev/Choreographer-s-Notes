import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import '@/lib/calendarLocale';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DatabaseProvider>
            <RootNavigator />
          </DatabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/[groupId]" options={{ title: 'Группа' }} />
        <Stack.Screen name="group/edit" options={{ presentation: 'modal', title: 'Группа' }} />
        <Stack.Screen name="lesson/[lessonId]/index" options={{ title: 'Конспект' }} />
        <Stack.Screen name="lesson/[lessonId]/run" options={{ headerShown: false }} />
        <Stack.Screen
          name="lesson/new"
          options={{ presentation: 'modal', title: 'Новый конспект' }}
        />
        <Stack.Screen
          name="lesson/[lessonId]/edit"
          options={{ presentation: 'modal', title: 'Конспект урока' }}
        />
        <Stack.Screen
          name="lesson/[lessonId]/block"
          options={{ presentation: 'modal', title: 'Блок урока' }}
        />
        <Stack.Screen
          name="lesson/[lessonId]/attach"
          options={{ presentation: 'modal', title: 'Материалы блока' }}
        />
        <Stack.Screen
          name="lesson/[lessonId]/attachment"
          options={{ presentation: 'modal', title: 'Материал в блоке' }}
        />
        <Stack.Screen name="material/[materialId]" options={{ title: 'Материал' }} />
        <Stack.Screen
          name="material/add-link"
          options={{ presentation: 'modal', title: 'Ссылка на материал' }}
        />
      </Stack>
    </>
  );
}
