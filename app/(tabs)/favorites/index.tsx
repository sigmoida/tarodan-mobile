/**
 * Favorilerim — sekme kökü (alt menüde Ana Sayfa'dan sonra): AppShell (başlıklı yüzen bar; ☰ +
 * Mesajlar/Bildirimler) + ürün satırları. Misafir = giriş EmptyState, ilk yükleme = Skeleton, hata =
 * ErrorState + yeniden dene, boş = EmptyState. Kaldırma / sepet geri bildirimi eylemsiz `toast`
 * (hook'ta; web ile aynı). Kaydırma alt menüyü daraltır. URL `/favorites`.
 */
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, pageListContentStyle, usePageScrollValue } from '@/ui';
import { tabDiag } from '@/components/_tabDiag';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE (CLAUDE.md §12).
  const tabInset = useTabBarInset();
  const page = usePageScrollValue();
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);

  if (!f.isAuthenticated) {
    return (
      <AppShell variant="title" title={t('favorites.myFavorites')}>
        <EmptyState
          icon="heart"
          title={t('favorites.myFavorites')}
          subtitle={t('favorites.loginRequired')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login')}
          secondaryLabel={t('auth.createAccount')}
          onSecondary={() => router.push('/(auth)/register')}
        />
      </AppShell>
    );
  }

  const initialLoading = f.isLoading && f.items.length === 0;
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={page.contentStyle([pageListContentStyle, { paddingBottom: tabInset }])}
        progressViewOffset={page.topInset}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        ListEmptyComponent={
          initialLoading ? (
            <RowListSkeleton rows={4} />
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
        renderItem={({ item }) => <FavoriteCard item={item} f={f} />}
      />
    </AppShell>
  );
}

export default tabDiag('favorites', FavoritesScreen);
