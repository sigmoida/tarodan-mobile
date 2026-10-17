/**
 * Favorilerim — sekme kökü (alt menüde Ana Sayfa'dan sonra): AppShell (başlıklı yüzen bar; ☰ +
 * Mesajlar/Bildirimler) + ürün satırları. Misafir = giriş EmptyState, ilk yükleme = Skeleton, hata =
 * ErrorState + yeniden dene, boş = EmptyState. Kaldırma / sepet geri bildirimi eylemsiz `toast`
 * (hook'ta; web ile aynı). Kaydırma alt menüyü daraltır. URL `/favorites`.
 */
import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, pageListContentStyle, useDelayedLoading, usePageScrollValue } from '@/ui';
import { listWindowing } from '@/lib/list/windowing';
import { useStableCallback } from '@/hooks/useStableCallback';
import type { WishlistItem } from '@/hooks/useFavorites';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';
import { FavoritesSkeleton } from './_components/FavoriteCardSkeleton';

const favoriteKey = (item: WishlistItem) => item.id;

function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE (app/CLAUDE.md › Thin screens).
  const tabInset = useTabBarInset();
  const initialLoading = f.isLoading && f.items.length === 0;
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(initialLoading);
  const page = usePageScrollValue();
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);
  // Kararlı renderItem + memo'lu kart: işleyiciler referans-kararlı (en güncel `f`'i çağırır), sepet
  // durumu kartın kendi seçicisinde — ekran render olsa da satırlar yeniden çizilmez.
  const onRemove = useStableCallback(f.handleRemove);
  const onCartAction = useStableCallback(f.handleCartAction);
  const renderFavorite = useCallback(
    ({ item }: { item: WishlistItem }) => (
      <FavoriteCard item={item} onRemove={onRemove} onCartAction={onCartAction} />
    ),
    [onRemove, onCartAction],
  );

  if (!f.isAuthenticated) {
    return (
      <AppShell variant="title" title={t('favorites.myFavorites')}>
        <EmptyState
          icon="heart"
          title={t('favorites.myFavorites')}
          subtitle={t('favorites.loginRequired')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login')}
        />
      </AppShell>
    );
  }

  const loadFailed = !!f.error && f.items.length === 0;

  return (
    <AppShell
      variant="title"
      title={`${t('favorites.myFavorites')} (${f.getFavoriteCount()})`}
      scroll={page}
    >
      <Animated.FlatList
        {...tabScroll}
        {...page.scrollProps}
        scrollEventThrottle={16}
        testID="favorites-list"
        data={initialLoading || loadFailed ? [] : f.items}
        keyExtractor={favoriteKey}
        {...listWindowing}
        contentContainerStyle={page.contentStyle([pageListContentStyle, { paddingBottom: tabInset }])}
        progressViewOffset={page.topInset}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        ListEmptyComponent={
          initialLoading || showSkeleton ? (
            showSkeleton ? <FavoritesSkeleton /> : null
          ) : loadFailed ? (
            <ErrorState
              title={t('favorites.loadFailedTitle')}
              message={t('favorites.loadErrorDesc')}
              onRetry={() => f.fetchFavorites()}
            />
          ) : (
            <EmptyState
              icon="heart"
              title={t('favorites.empty')}
              subtitle={t('favorites.emptyStateDesc')}
              actionLabel={t('order.exploreProducts')}
              onAction={() => router.push('/search')}
            />
          )
        }
        ListFooterComponent={
          f.items.length > 0 ? (
            <Button
              variant="outline"
              title={t('favorites.exploreMoreProducts')}
              style={styles.moreButton}
              onPress={() => router.push('/search')}
            />
          ) : null
        }
        renderItem={renderFavorite}
      />
    </AppShell>
  );
}

export default tabDiag('favorites', FavoritesScreen);
