import Constants from 'expo-constants';
import { View } from 'react-native';

import { useUiPrefs, type ThemePreference } from '@/stores/uiPrefs';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Screen, Text } from '@/ui';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const themePreference = useUiPrefs((state) => state.themePreference);
  const setThemePreference = useUiPrefs((state) => state.setThemePreference);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
        <Card>
          <Text variant="subtitle">Тема оформления</Text>
          <View
            style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant={themePreference === option.value ? 'primary' : 'secondary'}
                onPress={() => setThemePreference(option.value)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
            Сохранение выбора между запусками, размер шрифта конспекта и резервные копии — этап Э8.
          </Text>
        </Card>

        <Card>
          <Text variant="subtitle">О приложении</Text>
          <Text tone="muted">
            Версия {Constants.expoConfig?.version ?? '1.0.0'} · сборка{' '}
            {Constants.expoConfig?.android?.versionCode ?? 1}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
