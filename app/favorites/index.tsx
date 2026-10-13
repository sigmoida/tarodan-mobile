/**
 * Favorilerim — yığın ekranı (yan menü / profil / reklam bağlantılarından açılır): PageShell (beyaz
 * üst bar + geri oku, başlıkta sayaç) + ürün satırları. Misafir = giriş EmptyState, ilk yükleme =
 * Skeleton, hata = ErrorState + yeniden dene, boş = EmptyState. Sepete ekleme geri bildirimi
 * "Sepete git" eylemli olduğundan Snackbar (toast eylem desteklemez); Snackbar `overlay`'de durur.
 * URL `/favorites`.
 */
import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, Snackbar, pageListContentStyle } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t('favorites.myFavorites')}
        empty
        emptyState={{
          icon: 'heart',
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
      mode="list"
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
        data={initialLoading || loadFailed ? [] : f.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={pageListContentStyle}
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
    </PageShell>
  );
}
