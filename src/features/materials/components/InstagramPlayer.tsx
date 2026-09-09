import { useState } from 'react';
import { ActivityIndicator, Linking, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { instagramEmbedUrl, instagramFrameSize } from '@/lib/instagram';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/ui';

/**
 * Встроенное окно Instagram: показываем страницу поста прямо в приложении.
 * Это чужой плеер — нашего таймкода в нём нет, нужен интернет, а формат
 * встраивания Instagram может поменять в любой момент. Поэтому кнопка
 * «Открыть в Instagram» есть всегда, независимо от того, загрузилось окно или нет.
 */
export function InstagramPlayer({ url }: { url: string }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const frame = instagramFrameSize(width - theme.spacing.lg * 2, height);
  const embedUrl = instagramEmbedUrl(url);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {embedUrl && !failed ? (
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            height: frame.height,
            overflow: 'hidden',
            width: frame.width,
          }}
        >
          <WebView
            source={{ uri: embedUrl }}
            style={{ backgroundColor: 'transparent', flex: 1 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onHttpError={({ nativeEvent }) => {
              setLoading(false);
              if (nativeEvent.statusCode >= 400) setFailed(true);
            }}
          />

          {loading ? (
            <View
              style={{
                alignItems: 'center',
                bottom: 0,
                justifyContent: 'center',
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
              }}
            >
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : null}
        </View>
      ) : (
        <Text tone="muted">
          {embedUrl
            ? 'Не удалось открыть видео в приложении — возможно, нет интернета или пост закрыт. Откройте его в Instagram.'
            : 'Эту ссылку Instagram можно только открыть в приложении: встраиваются посты, рилсы и IGTV.'}
        </Text>
      )}

      <Button
        title="Открыть в Instagram"
        variant="secondary"
        onPress={() => Linking.openURL(url)}
      />

      <Text variant="caption" tone="muted">
        Видео по ссылке требует интернета. Для урока в зале надёжнее добавить файл на планшет.
      </Text>
    </View>
  );
}
