/**
 * Favorilerim — yığın ekranı (yan menü / profil / reklam bağlantılarından açılır): PageShell (beyaz
 * üst bar + geri oku, başlıkta sayaç) + ürün satırları. Misafir = giriş EmptyState, ilk yükleme =
 * Skeleton, hata = ErrorState + yeniden dene, boş = EmptyState. Kaldırma / sepet geri bildirimi
 * eylemsiz `toast` (hook'ta; web ile aynı). URL `/favorites`.
 */
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, pageListContentStyle, usePageScrollHandler } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  const page = usePageScrollHandler();

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
      scroll={page}
    >
      <Animated.FlatList
        {...page.listProps}
        data={initialLoading || loadFailed ? [] : f.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
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
