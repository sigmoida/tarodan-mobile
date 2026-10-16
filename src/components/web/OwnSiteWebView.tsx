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
  /** `embed`: yükleme hatasında "Tarayıcıda aç" ile açılacak adres. */
  browserUrl?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const target = typeof url === 'string' && isAllowedOwnPage(url) ? url : null;
  const webRef = useRef<WebView>(null);
  const back = onBack ?? leaveOwnSiteScreen;
  const embed = mode === 'embed';
  // `onNavigationStateChange` aynı engelli adres için birden çok kez gelir
  // (yükleme başladı / bitti / başlık değişti). Ekrandan çıkış TEK sefer:
  // aksi halde `router.back()` iki ekran geri giderdi. Bayrak yalnız çıkış
  // GERÇEKTEN yapıldıysa (geri ya da ana sekmelere replace) kalkar.
  const left = useRef(false);
  // Engelli sayfaya geçildi: çıkış ne olursa olsun WebView sökülür, satın alma
  // sayfası hiçbir durumda ekranda kalmaz (Apple 3.1.1).
  const [blocked, setBlocked] = useState(false);
  // `embed`: ağ/HTTP hatası ya da kaçış döngüsü → hata durumu.
  const [failed, setFailed] = useState(false);
  // WebView'in yüklediği belge ve yeniden kurma sayacı (`key`): kaçıştan sonra
  // WebView doğrudan belge adresine yeniden kurulur (`goBack`'e güvenilmez).
  const [docUrl, setDocUrl] = useState(target);
  const [attempt, setAttempt] = useState(0);
  const escape = useRef(newEscapeState(target));
  useEffect(() => {
    left.current = false;
    escape.current = newEscapeState(target);
    setBlocked(false);
    setFailed(false);
    setDocUrl(target);
  }, [target]);

  const reload = () => setAttempt((n) => n + 1);
  const retry = () => {
    // Bilinçli yeniden deneme döngü sayacını sıfırlar; tarayıcıda açılmış
    // hedefler yine açılmaz.
    escape.current.redirected.clear();
    escape.current.pending = false;
    setFailed(false);
    reload();
  };

  /**
   * `embed`: site içi (SPA) geçişle uygulama modu dışına çıkıldı.
   * (a) hedef tarayıcıda YALNIZ BİR KEZ açılır; (b) WebView son belgeye
   * yeniden kurulur; (c) yeniden kurulduktan sonra AYNI kaçış tekrar olursa
   * döngüye girilmez — hata durumu. Yeniden kurulum beklenirken eski
   * WebView'den gelen tekrar olaylar yok sayılır.
   */
  const handleEscape = (to: string) => {
    const s = escape.current;
    if (s.pending) return;
    webRef.current?.stopLoading();
    if (!s.opened.has(to)) {
      s.opened.add(to);
      Linking.openURL(to).catch(() => undefined);
    }
    if (s.redirected.has(to)) {
      setFailed(true);
      return;
    }
    s.redirected.add(to);
    s.pending = true;
    setDocUrl(s.lastDoc);
    reload();
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
          source={{ uri: docUrl ?? target }}
          // Her adres (mailto:, tel:, intent:, itms-apps:, özel şemalar dahil)
          // aşağıdaki karar kapısından geçsin: varsayılan liste (http/https)
          // dışındaki şemaları kütüphane kapıya sormadan `Linking` ile açıyordu.
          originWhitelist={ALL_ORIGINS}
          startInLoadingState
          renderLoading={() => <Spinner />}
          // Her üst çerçeve yüklemesi karar kapısından geçer: satın alma sayfaları
          // engellenir, dış https linkleri ve mailto/tel sisteme gider, diğer
          // şemalar engellenir, iframe'ler serbesttir. `isTopFrame` Android'de
          // yok → üst çerçeve say.
          onShouldStartLoadWithRequest={(req) => {
            const decision = decideWebRequest(req.url, req.isTopFrame !== false, mode);
            if (decision === 'external') Linking.openURL(req.url).catch(() => undefined);
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
          // /membership'e geçilirse ekrandan çık (çıkış her zaman router üzerinden,
          // geçmiş yoksa ana sekmelere). `embed`: uygulama modu dışına çıkış → `handleEscape`.
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
            if (decision === 'external') {
              handleEscape(nav.url);
              return;
            }
            // Belgeye dönüldü (yeni WebView yüklendi): bekleyen yeniden kurulum bitti.
            escape.current.pending = false;
            if (nav.url !== 'about:blank') escape.current.lastDoc = nav.url;
          }}
        />
      ) : (
        <ErrorState onRetry={back} retryLabel={t('common.back')} />
      )}
    </View>
  );
}

/** `originWhitelist`: her adres karar kapısına gelsin (bkz. `decideWebRequest`). */
const ALL_ORIGINS = ['*'];

/** `embed` kaçış durumu: açılan hedefler, yeniden kurulan kaçışlar, son belge. */
function newEscapeState(doc: string | null) {
  return {
    opened: new Set<string>(),
    redirected: new Set<string>(),
    pending: false,
    lastDoc: doc,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
});
