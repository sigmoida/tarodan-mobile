import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, ErrorState, ScreenHeader, Spinner } from '@/ui';
import { isOwnWebUrl } from '@/lib/ads/openAdLink';

/**
 * Mobil karşılığı olmayan site sayfalarını (reklam linkleri) uygulama içinde
 * açar. Yalnız KENDİ sitemizin https adresleri yüklenir — rota dışarıdan
 * (derin bağlantı) da çağrılabildiği için host burada yeniden doğrulanır.
 */
export default function InAppWebScreen() {
  const { t } = useTranslation();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const target = typeof url === 'string' && isOwnWebUrl(url) ? url : null;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Tarodan" onBack={() => router.back()} />
      {target ? (
        <WebView
          source={{ uri: target }}
          startInLoadingState
          renderLoading={() => <Spinner />}
          // Sitemizin dışına çıkan gezinmeleri engelle.
          onShouldStartLoadWithRequest={(req) => isOwnWebUrl(req.url) || req.url === 'about:blank'}
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
