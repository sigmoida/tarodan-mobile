import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, ErrorState, ScreenHeader, Spinner } from '@/ui';
import { decideWebRequest, isAllowedOwnPage } from '@/lib/ads/webViewGuard';

/**
 * Ekrandan çık: geçmiş varsa geri, YOKSA (soğuk açılış / derin bağlantıyla
 * doğrudan açılan ekran) ana sekmelere. `router.back()` geçmiş yokken hiçbir
 * şey yapmaz — engelli sayfa ekranda kalırdı. Çıkış gerçekten yapıldıysa `true`.
 */
export function leaveOwnSiteScreen(): boolean {
  try {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
    return true;
  } catch {
    return false;
  }
}

/**
 * Kendi sitemizin bir sayfasını uygulama içinde gösteren tam ekran: başlık +
 * WebView. Yalnız KENDİ sitemizin https adresleri yüklenir (adres burada
 * yeniden doğrulanır); satın alma sayfaları (üyelik/boost) HİÇBİR yoldan
 * açılmaz — bkz. `webViewGuard` (Apple 3.1.1). Adres geçersizse hata durumu.
 *
 * Kullanan: `app/in-app-web.tsx` (reklam linkleri ve mobil karşılığı olmayan
 * site sayfaları).
 */
export function OwnSiteWebView({
  url,
  title,
  onBack,
  testID,
}: {
  url: string | null | undefined;
  title: string;
  /** Başlıktaki geri / hata durumundaki düğme. Varsayılan `leaveOwnSiteScreen`. */
  onBack?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const target = typeof url === 'string' && isAllowedOwnPage(url) ? url : null;
  const webRef = useRef<WebView>(null);
  const back = onBack ?? leaveOwnSiteScreen;
  // `onNavigationStateChange` aynı engelli adres için birden çok kez gelir
  // (yükleme başladı / bitti / başlık değişti). Ekrandan çıkış TEK sefer:
  // aksi halde `router.back()` iki ekran geri giderdi. Bayrak yalnız çıkış
  // GERÇEKTEN yapıldıysa (geri ya da ana sekmelere replace) kalkar.
  const left = useRef(false);
  // Engelli sayfaya geçildi: çıkış ne olursa olsun WebView sökülür, satın alma
  // sayfası hiçbir durumda ekranda kalmaz (Apple 3.1.1).
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    left.current = false;
    setBlocked(false);
  }, [target]);

  return (
    <View style={styles.root} testID={testID}>
      <ScreenHeader title={title} onBack={back} />
      {blocked ? null : target ? (
        <WebView
          ref={webRef}
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
          // Çıkış her zaman router üzerinden (`onBack` değil): geçmiş yoksa
          // ana sekmelere düşülür.
          onNavigationStateChange={(nav) => {
            if (left.current || !nav.url || decideWebRequest(nav.url, true) !== 'block') return;
            webRef.current?.stopLoading();
            setBlocked(true);
            left.current = leaveOwnSiteScreen();
          }}
        />
      ) : (
        <ErrorState onRetry={back} retryLabel={t('common.back')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
});
