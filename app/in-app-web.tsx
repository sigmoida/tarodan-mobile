import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, ErrorState, ScreenHeader, Spinner } from '@/ui';
import { decideWebRequest, isAllowedOwnPage } from '@/lib/ads/webViewGuard';

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
          // Her üst çerçeve yüklemesi karar kapısından geçer: satın alma sayfaları
          // engellenir, dış https linkleri sistem tarayıcısına gider, iframe'ler
          // serbesttir. `isTopFrame` Android'de yok → üst çerçeve say.
          onShouldStartLoadWithRequest={(req) => {
            const decision = decideWebRequest(req.url, req.isTopFrame !== false);
            if (decision === 'external') Linking.openURL(req.url).catch(() => {});
            return decision === 'allow';
          }}
          // Site içi (SPA/pushState) gezinmeler yukarıdaki kancadan GEÇMEZ: menüden
          // /membership'e geçilirse ekrandan çık.
          onNavigationStateChange={(nav) => {
            if (nav.url && decideWebRequest(nav.url, true) === 'block') router.back();
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
