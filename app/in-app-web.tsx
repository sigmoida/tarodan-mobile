import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, ErrorState, ScreenHeader, Spinner } from '@/ui';
import { isAllowedOwnPage, shouldAllowWebRequest } from '@/lib/ads/webViewGuard';

/**
 * Mobil karşılığı olmayan site sayfalarını (reklam linkleri) uygulama içinde
 * açar. Yalnız KENDİ sitemizin https adresleri yüklenir — rota dışarıdan
 * (derin bağlantı) da çağrılabildiği için host burada yeniden doğrulanır.
 * Satın alma sayfaları (üyelik/boost) HİÇBİR yoldan açılmaz — bkz. `webViewGuard`
 * (Apple 3.1.1: site menüsünden /membership'e geçip uygulama içinde satın alma).
 */
export default function InAppWebScreen() {
  const { t } = useTranslation();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const target = typeof url === 'string' && isAllowedOwnPage(url) ? url : null;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Tarodan" onBack={() => router.back()} />
      {target ? (
        <WebView
          source={{ uri: target }}
          startInLoadingState
          renderLoading={() => <Spinner />}
          onShouldStartLoadWithRequest={(req) => shouldAllowWebRequest(req.url)}
          // Site içi (SPA/pushState) gezinmeler yukarıdaki kancadan GEÇMEZ: menüden
          // /membership'e geçilirse ekrandan çık.
          onNavigationStateChange={(nav) => {
            if (nav.url && !shouldAllowWebRequest(nav.url)) router.back();
          }}
        />
      ) : (
        <ErrorState onRetry={() => router.back()} retryLabel={t('common.back')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
});
