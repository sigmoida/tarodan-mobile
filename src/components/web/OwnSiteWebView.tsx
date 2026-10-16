import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, ErrorState, ScreenHeader, Spinner } from '@/ui';
import { decideWebRequest, isAllowedOwnPage, type WebViewMode } from '@/lib/ads/webViewGuard';

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
 * site sayfaları; `mode="site"`) ve yasal belgeler (`LegalWebPage`;
 * `mode="embed"`: yalnız `/app/*` içeride kalır, yükleme hatasında "Tekrar
 * dene" + "Tarayıcıda aç").
 */
export function OwnSiteWebView({
  url,
  title,
  onBack,
  mode = 'site',
  browserUrl,
  testID,
}: {
  url: string | null | undefined;
  title: string;
  /** Başlıktaki geri / hata durumundaki düğme. Varsayılan `leaveOwnSiteScreen`. */
  onBack?: () => void;
  /** Gezinme kipi — bkz. `WebViewMode`. */
  mode?: WebViewMode;
  /** `embed`: yükleme hatasında "Tarayıcıda aç" ile açılacak normal web adresi. */
  browserUrl?: string;
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
  // `embed`: ağ/HTTP hatası → hata durumu; "Tekrar dene" WebView'i yeniden kurar.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // `embed`: site içi (SPA) geçişle uygulama modu dışına çıkılan son adres —
  // aynı adres için gelen tekrar olaylarında tarayıcı bir kez açılır.
  const escapedTo = useRef<string | null>(null);
  useEffect(() => {
    left.current = false;
    escapedTo.current = null;
    setBlocked(false);
    setFailed(false);
  }, [target]);
  const embed = mode === 'embed';
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  return (
    <View style={styles.root} testID={testID}>
      <ScreenHeader floating={false} title={title} onBack={back} />
      {blocked ? null : target && failed ? (
        <ErrorState
          testID="own-site-load-error"
          title={t('mobile.webPageLoadFailedTitle')}
          message={t('mobile.webPageLoadFailedDescription')}
          onRetry={retry}
          secondaryLabel={browserUrl ? t('mobile.openInBrowser') : undefined}
          onSecondary={browserUrl ? () => Linking.openURL(browserUrl).catch(() => undefined) : undefined}
        />
      ) : target ? (
        <WebView
          key={attempt}
          ref={webRef}
          source={{ uri: target }}
          startInLoadingState
          renderLoading={() => <Spinner />}
          // Her üst çerçeve yüklemesi karar kapısından geçer: satın alma sayfaları
          // engellenir, dış https linkleri sistem tarayıcısına gider, iframe'ler
          // serbesttir. `isTopFrame` Android'de yok → üst çerçeve say.
          onShouldStartLoadWithRequest={(req) => {
            const decision = decideWebRequest(req.url, req.isTopFrame !== false, mode);
            if (decision === 'external') Linking.openURL(req.url).catch(() => {});
            return decision === 'allow';
          }}
          // Yalnız `embed`: çevrimdışı / sunucu hatasında WebView'in kendi hata
          // sayfası yerine hata durumu (yeniden dene + tarayıcıda aç).
          onError={embed ? () => setFailed(true) : undefined}
          onHttpError={
            embed
              ? (e) => {
                  if (e.nativeEvent.statusCode >= 400) setFailed(true);
                }
              : undefined
          }
          // Site içi (SPA/pushState) gezinmeler yukarıdaki kancadan GEÇMEZ: menüden
          // /membership'e geçilirse ekrandan çık.
          // Çıkış her zaman router üzerinden (`onBack` değil): geçmiş yoksa
          // ana sekmelere düşülür.
          onNavigationStateChange={(nav) => {
            if (left.current || !nav.url) return;
            const decision = decideWebRequest(nav.url, true, mode);
            if (decision === 'block') {
              webRef.current?.stopLoading();
              setBlocked(true);
              left.current = leaveOwnSiteScreen();
              return;
            }
            if (!embed) return;
            if (decision === 'allow') {
              escapedTo.current = null;
              return;
            }
            // `embed`: SPA geçişiyle uygulama modu dışına çıkıldı — sayfa
            // tarayıcıda açılır, WebView belgeye geri döner (geçmiş yoksa yeniden kurulur).
            if (escapedTo.current === nav.url) return;
            escapedTo.current = nav.url;
            webRef.current?.stopLoading();
            if (nav.canGoBack) webRef.current?.goBack();
            else setAttempt((n) => n + 1);
            Linking.openURL(nav.url).catch(() => undefined);
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
