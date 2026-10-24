import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import { pageListContentStyle, usePageScrollHandler, usePageContentStyle, useRowGrid } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { FollowingSellerRow } from '@/components/following/FollowingSellerRow';
import { useFollowing, FollowedSeller } from '@/hooks/useFollowing';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { listWindowing } from '@/lib/list/windowing';
import { qk } from '@/lib/query';

const sellerKey = (seller: FollowedSeller) => seller.id;

/**
 * Takip ettiklerim — PageShell (list modu: Skeleton / boş durum / misafir) + sanallaştırılmış web
 * Card satıcı satırları. Takip listesi tek uçtan gelir (sayfalama yok) ve uygulama genelinde
 * `isFollowing` için tam liste olarak paylaşılır; bu yüzden tek sorgu, yalnız çizim sanallaştırılır.
 */
export default function FollowingScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { following, isLoading, isError, fetchFollowing, unfollowSeller, getFollowingCount } = useFollowing();
  const [refreshing, setRefreshing] = useState(false);
  const page = usePageScrollHandler();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle(pageListContentStyle);
  // Large screens: the rows become a card grid (src/ui/CLAUDE.md › Large screens).
  const grid = useRowGrid();

  // Ekrana dönüşte yalnız bayatsa tazele (takip/bırakma zaten önbelleği güncelliyor).
  useRefetchStaleOnFocus([qk.follow.following], isAuthenticated);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFollowing();
    setRefreshing(false);
  };

  // `unfollowSeller` her render'da yeni referans: ref üzerinden çağrılır ki satır callback'i kararlı kalsın.
  const unfollowRef = useRef(unfollowSeller);
  unfollowRef.current = unfollowSeller;
  const handleUnfollow = useCallback((seller: FollowedSeller) => {
    void unfollowRef.current(seller.id);
  }, []);
  const renderSeller = useCallback(
    ({ item, index }: { item: FollowedSeller; index: number }) =>
      grid.cell(index, <FollowingSellerRow seller={item} onUnfollow={handleUnfollow} />),
    [handleUnfollow, grid],
  );

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <AuthGatePage
        title={t('following.title')}
        icon="user-group"
        subtitle={t('following.loginSubtitle')}
      />
    );
  }

  return (
    <PageShell
      title={t('following.titleWithCount', { count: getFollowingCount() })}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      mode="list"
      scroll={page}
      loading={isLoading && following.length === 0}
      loadingFallback={<RowListSkeleton rows={4} />}
      error={isError && following.length === 0 ? true : undefined}
      errorTitle={t('common.error')}
      errorMessage={t('following.loadFailed')}
      onRetry={() => fetchFollowing()}
      empty={!isLoading && !isError && following.length === 0}
      emptyState={{
        icon: 'user-group',
        title: t('following.emptyTitle'),
        subtitle: t('following.emptySubtitle'),
        actionLabel: t('following.exploreSellers'),
        onAction: () => router.push('/search'),
      }}
    >
      <Animated.FlatList
        key={grid.listKey}
        numColumns={grid.numColumns}
        {...page.listProps}
        testID="following-list"
        data={following}
        keyExtractor={sellerKey}
        renderItem={renderSeller}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(listContentStyle)}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </PageShell>
  );
}
