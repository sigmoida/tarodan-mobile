import { useTranslation } from 'react-i18next';
import { View, StyleSheet, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  EmptyState,
  ErrorState,
  SectionCard,
  Spinner,
  Text,
  pageListContentStyle,
  theme,
  Icon,
  useDelayedLoading,
  usePageScrollHandler,
} from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { listWindowing } from '@/lib/list/windowing';
import { ListFooterRetry } from '@/components/common/ListFooterRetry';
import { useAllProductReviews } from './_hooks/useAllProductReviews';
import { ReviewRow } from './_components/ReviewRow';
import { ReviewListSkeleton } from './_components/ReviewListSkeleton';

const { colors, spacing, iconSize } = theme;

/**
 * Ürün değerlendirmeleri — PageShell + puan özeti (SectionCard) ve sayfalı liste. Veri
 * `useAllProductReviews`; satır `ReviewRow` (detaydaki önizlemeyle ortak).
 */
export default function ProductReviewsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const productId = String(id);
  const f = useAllProductReviews(productId, !!id);
  const [refreshing, setRefreshing] = useState(false);
  const page = usePageScrollHandler();
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(f.isLoading);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await f.refetch();
    setRefreshing(false);
  }, [f]);

  return (
    <PageShell
      title={t('review.reviews')}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    >
      <Animated.FlatList
        {...page.listProps}
        {...listWindowing}
        data={f.isLoading ? [] : f.reviews}
        keyExtractor={(item, index) => item.id ?? String(index)}
        renderItem={({ item, index }) => <ReviewRow review={item} divided={index > 0} />}
        contentContainerStyle={page.contentStyle(styles.content)}
        ListHeaderComponent={
          // No summary while the list failed to load: its count would read "0 reviews".
          !f.loadFailed && (f.average != null || f.total > 0) ? (
            <SectionCard style={styles.summary}>
              <View style={styles.summaryRow}>
                <Icon name="star" variant="solid" size={iconSize.md} color={colors.warning[400]!} />
                <Text variant="h2">{Number(f.average ?? 0).toFixed(1)}</Text>
                <Text variant="bodySm" tone="muted">
                  {t('review.countLabel', { count: f.total })}
                </Text>
              </View>
            </SectionCard>
          ) : null
        }
        ListEmptyComponent={
          f.isLoading || showSkeleton ? (
            showSkeleton ? <ReviewListSkeleton /> : null
          ) : f.loadFailed ? (
            <ErrorState placement="list" onRetry={() => void f.refetch()} />
          ) : (
            <EmptyState placement="list" icon="star" title={t('review.noReviews')} subtitle={t('emptyState.reviewsHint')} />
          )
        }
        onEndReached={() => {
          // Sayfa hatasında kaydırdıkça otomatik yeniden denemez; kullanıcı "Tekrar dene" satırına basar.
          if (f.hasNextPage && !f.isFetchingNextPage && !f.isFetchNextPageError) f.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          f.isFetchNextPageError ? (
            <ListFooterRetry onRetry={() => void f.fetchNextPage()} />
          ) : f.isFetchingNextPage ? (
            <View style={styles.footer}>
              <Spinner />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={page.topInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: { ...pageListContentStyle, gap: 0, flexGrow: 1 },
  summary: { marginBottom: spacing[3] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  footer: { paddingVertical: spacing[4] },
});
