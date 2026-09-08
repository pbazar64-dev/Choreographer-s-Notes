import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null; componentStack: string | null };

/**
 * Последний рубеж: без него любая ошибка в приложении на планшете выглядит
 * как «заставка мигнула и всё закрылось», без единой подсказки о причине.
 * Стили намеренно свои, без темы: тема сама может оказаться причиной падения.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error('Ошибка приложения:', error);
  }

  private report(): string {
    const { error, componentStack } = this.state;
    return [
      error?.message ?? 'Неизвестная ошибка',
      '',
      error?.stack ?? '',
      componentStack ? `\nКомпоненты:${componentStack}` : '',
    ].join('\n');
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Приложение не смогло запуститься</Text>
        <Text style={styles.subtitle}>
          Покажите этот текст разработчику — по нему видно, что именно сломалось.
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text selectable style={styles.report}>
            {this.report()}
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={styles.button}
            onPress={() => Share.share({ message: this.report() })}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Отправить текст ошибки</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={() => this.setState({ error: null, componentStack: null })}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>Попробовать снова</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F3EF', flex: 1, gap: 12, padding: 24, paddingTop: 48 },
  title: { color: '#1C1A17', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#6B6560', fontSize: 15 },
  scroll: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCD7CF',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  scrollContent: { padding: 12 },
  report: { color: '#1C1A17', fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    alignItems: 'center',
    backgroundColor: '#2F5D50',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: '#EDEAE4' },
  buttonText: { color: '#FAF9F7', fontSize: 15, fontWeight: '500' },
  secondaryText: { color: '#1C1A17' },
});
