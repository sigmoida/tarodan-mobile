import { FlatList } from 'react-native';
import { Button, EmptyState, Snackbar, pageListContentStyle } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

/**
 * Favoriler — PageShell (Skeleton / hata + yeniden dene / boş durum / misafir) + ürün satırları.
 * Sepete ekleme geri bildirimi "Sepete git" eylemli olduğundan Snackbar (toast eylem desteklemez).
 */
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t('favorites.myFavorites')}
        onBack={back}
        empty
        emptyState={{
          icon: 'heart-outline',
          title: t('favorites.myFavorites'),
          subtitle: t('favorites.loginRequired'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
          secondaryLabel: t('auth.createAccount'),
          onSecondary: () => router.push('/(auth)/register'),
        }}
      />
    );
  }

  const initialLoading = f.isLoading && f.items.length === 0;
  const loadFailed = !!f.error && f.items.length === 0;

  return (
    <PageShell
      title={`${t('favorites.myFavorites')} (${f.getFavoriteCount()})`}
      onBack={back}
      mode="list"
      loading={initialLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      error={loadFailed ? true : undefined}
      errorTitle={t('favorites.loadFailedTitle')}
      errorMessage={t('favorites.loadErrorDesc')}
      onRetry={() => f.fetchFavorites()}
      empty={f.items.length === 0}
      emptyState={{
        icon: 'heart-outline',
        title: t('favorites.empty'),
        subtitle: t('favorites.emptyStateDesc'),
        actionLabel: t('order.exploreProducts'),
        onAction: () => router.push('/(tabs)/search'),
      }}
      overlay={
        <Snackbar
          visible={f.snackbar.visible}
          onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
          duration={2000}
          action={{ label: t('product.goToCart'), onPress: () => router.push('/cart') }}
        >
          {f.snackbar.message}
        </Snackbar>
      }
    >
      <FlatList
        data={f.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={pageListContentStyle}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        ListFooterComponent={
          <Button
            variant="outline"
            title={t('favorites.exploreMoreProducts')}
            style={styles.moreButton}
            onPress={() => router.push('/(tabs)/search')}
          />
        }
        renderItem={({ item }) => <FavoriteCard item={item} f={f} />}
      />
    </PageShell>
  );
}
