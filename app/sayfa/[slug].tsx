import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, Spinner, Text, ScreenHeader } from '@/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { pagesApi } from '@/lib/api';

const { colors } = theme;

// API page.content bir HTML string'idir; düz <Text> ile basıldığında etiketler ham
// görünür. Bu yüzden WebView + htmlWrapper ile tasarım token'larına uygun render edilir.
const htmlWrapper = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: ${colors.text.heading};
          font-size: 15px;
          line-height: 1.6;
          margin: 0;
          padding: 16px;
          background: ${colors.surface.DEFAULT};
        }
        h1, h2, h3 { color: ${colors.text.heading}; margin-top: 20px; }
        h1 { font-size: 22px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        p { margin: 10px 0; }
        a { color: ${colors.primary[600]!}; text-decoration: none; }
        ul, ol { padding-left: 20px; }
        li { margin: 6px 0; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        hr { border: none; border-top: 1px solid ${colors.border.DEFAULT}; margin: 16px 0; }
        blockquote {
          margin: 16px 0;
          padding: 8px 16px;
          border-left: 3px solid ${colors.primary[600]!};
          background: ${colors.primary[50]!};
          border-radius: 4px;
          color: ${colors.text.heading};
        }
        code {
          background: ${colors.surface.alt};
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Menlo', 'Courier New', monospace;
          font-size: 13px;
        }
      </style>
    </head>
    <body>${content}</body>
  </html>
`;

interface PageData {
  title: string;
  content: string;
  updatedAt?: string;
}

export default function DynamicCMSPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // CMS sayfası React Query ile (CLAUDE.md §6). Aynı slug ikinci kez açıldığında
  // önbellekten gelir; 404 ile diğer hatalar ayrı mesaj alır (mevcut davranış).
  const query = useQuery({
    queryKey: qk.catalog.pages(slug),
    enabled: !!slug,
    retry: false,
    queryFn: async (): Promise<PageData> => unwrapEnvelope<PageData>(await pagesApi.getBySlug(slug)),
  });

  const page = query.data ?? null;
  const loading = query.isLoading;
  const error = query.error
    ? (query.error as any)?.response?.status === 404
      ? 'Sayfa bulunamadı.'
      : 'Sayfa yüklenirken bir hata oluştu.'
    : '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Yükleniyor..." onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
          <Text style={styles.loadingText}>Sayfa yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Hata" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.danger[600]!} />
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            // Eskiden bu buton fetch'in TAMAMINI ikinci kez yazıyordu; sorgu
            // artık tek kaynak olduğu için yalnız tazeleme yetiyor.
            onPress={() => query.refetch()}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goBackLink} onPress={() => router.back()}>
            <Text style={styles.goBackText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={page?.title || 'Sayfa'}
        subtitle={formatDate(page?.updatedAt) ? `Son güncelleme: ${formatDate(page?.updatedAt)}` : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <WebView
        originWhitelist={['*']}
        source={{ html: htmlWrapper(page?.content || '') }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        scalesPageToFit={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6],
    gap: theme.spacing[2],
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.heading,
    marginTop: theme.spacing[2],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
    marginTop: theme.spacing[4],
    gap: theme.spacing[2],
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  goBackLink: {
    marginTop: theme.spacing[3],
  },
  goBackText: {
    fontSize: 14,
    color: colors.primary[600]!,
    fontWeight: '500',
  },
});
