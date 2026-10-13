import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/content/ContentPage';
import { useCmsWebViewNavigation } from './_hooks/useCmsWebViewNavigation';
import { useCmsPage } from './_hooks/useCmsPage';
import { htmlWrapper } from './_lib/html';

/**
 * CMS sayfası (`/sayfa/[slug]`) — PageShell (beyaz üst bar + güncelleme tarihi altyazısı;
 * yükleniyor = ilk açılış spinner'ı, hata = ErrorState + tekrar dene) + HTML gövdesini token'lı
 * belge olarak çizen WebView. Sorgu `useCmsPage`'te, gezinme kuralları `useCmsWebViewNavigation`'da.
 */
export default function DynamicCMSPage() {
  const f = useCmsPage();
  // CMS içeriği WebView içinde gezinmesin (bkz. _lib/navigation); dış/uygulama açılışı
  // yalnız kullanıcı dokunuşuyla. Hook, yükleme/hata dallarından ÖNCE çağrılır.
  const { onShouldStartLoadWithRequest, onLoadEnd } = useCmsWebViewNavigation();

  const title = f.loading
    ? f.t('common.loading')
    : f.error
      ? f.t('common.error')
      : f.page?.title || f.t('cmsPage.fallbackTitle');

  return (
    <PageShell
      title={title}
      subtitle={f.loading || f.error ? undefined : f.subtitle}
      onBack={goBackOrHome}
      mode="static"
      padding={false}
      loading={f.loading}
      loadingVariant="spinner"
      error={f.error || undefined}
      errorTitle={f.t('common.error')}
      errorMessage={f.error}
      onRetry={f.retry}
    >
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlWrapper(f.page?.content || '') }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        scalesPageToFit={false}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onLoadEnd={onLoadEnd}
        setSupportMultipleWindows={false}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: theme.colors.surface.DEFAULT,
  },
});
