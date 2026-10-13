import { useTranslation } from 'react-i18next';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { EmptyState, SectionCard, SkeletonText, Spinner, Text, pageListContentStyle, theme, Icon } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useAllProductReviews } from './_hooks/useAllProductReviews';
import { ReviewRow } from './_components/ReviewRow';

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await f.refetch();
    setRefreshing(false);
  }, [f]);

  return (
    <PageShell
      title={t('review.reviews')}
      mode="list"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    >
      <FlatList
        data={f.isLoading ? [] : f.reviews}
        keyExtractor={(item, index) => item.id ?? String(index)}
        renderItem={({ item, index }) => <ReviewRow review={item} divided={index > 0} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          f.average != null || f.total > 0 ? (
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
          f.isLoading ? (
            <View testID="reviews-skeleton">
              <SkeletonText lines={5} />
            </View>
          ) : (
            <EmptyState icon="star" title={t('review.noReviews')} />
          )
        }
        onEndReached={() => {
          if (f.hasNextPage && !f.isFetchingNextPage) f.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          f.isFetchingNextPage ? (
            <View style={styles.footer}>
              <Spinner />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
