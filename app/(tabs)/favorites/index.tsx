/**
 * Favoriler sekmesi — sekme kökü: AppShell (başlıklı beyaz bar) + ürün satırları.
 * Mesajlar sekmesi kalıbı: misafir = giriş EmptyState, ilk yükleme = Skeleton, hata = ErrorState
 * + yeniden dene, boş = EmptyState. Sepete ekleme geri bildirimi "Sepete git" eylemli olduğundan
 * Snackbar (toast eylem desteklemez). URL `/favorites` (sekme grubu URL'de görünmez).
 */
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, Snackbar, pageListContentStyle } from '@/ui';
import { tabDiag } from '@/components/_tabDiag';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

function FavoritesTabScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  const tabInset = useTabBarInset();
  const onScroll = useTabBarScrollHandler();

  if (!f.isAuthenticated) {
    return (
      <AppShell variant="title" title={t('favorites.myFavorites')}>
        <EmptyState
          fullscreen
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
    <AppShell variant="title" title={`${t('favorites.myFavorites')} (${f.getFavoriteCount()})`}>
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={initialLoading || loadFailed ? [] : f.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[pageListContentStyle, { paddingBottom: tabInset }]}
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
      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={2000}
        style={{ bottom: tabInset }}
        action={{ label: t('product.goToCart'), onPress: () => router.push('/cart') }}
      >
        {f.snackbar.message}
      </Snackbar>
    </AppShell>
  );
}

export default tabDiag('favorites', FavoritesTabScreen);
