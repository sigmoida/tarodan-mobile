import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { ProductGrid, ProductSortModal } from '@/components/product';
import { useTabBarPageScroll } from '@/components/shell/TabBarCollapse';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { withStackTabBar } from '@/components/shell/StackTabBar';
import { useCategory } from './_hooks/useCategory';
import { CategoryFilters } from './_components/CategoryFilters';

/**
 * Kategori — PageShell + tek ürün ızgarası (`ProductGrid`): ortak `ProductListToolbar` (arama, sıralama,
 * ızgara/liste, ölçek çipleri, sonuç sayısı) liste başlığında. Kontrolcü `useCategory`; ekran yalnız kompozisyon.
 * Yüzen alt menü (`withStackTabBar`) ekranın üstünde; aşağı kaydırınca Ana Sayfa gibi daralır (yalnız "+" kalır).
 */
function CategoryScreen() {
  const { t } = useTranslation();
  const f = useCategory();
  // Tek handler: alt menü daralması + üst barın kaydırma kenarı.
  const page = useTabBarPageScroll();
  const tabInset = useTabBarInset();

  return (
    <PageShell
      title={f.category?.name || t('common.category')}
      mode="list"
      contentWidth="full"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={
        <ProductSortModal
          visible={f.sortMenuVisible}
          value={f.sortBy}
          onSelect={(sortBy) => {
            f.setSortBy(sortBy);
            f.setSortMenuVisible(false);
          }}
          onClose={() => f.setSortMenuVisible(false)}
        />
      }
    >
      <ProductGrid
        items={(f.products as any[]) ?? []}
        layout={f.layout}
        scroll={page}
        bottomInset={tabInset}
        loading={f.isLoading}
        errorMessage={f.loadFailed ? t('collection.productsLoadFailed') : null}
        onRetry={f.retry}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        filtered={!!f.searchQuery || !!f.selectedScale}
        onClearFilters={() => {
          f.setSearchQuery('');
          f.setSelectedScale('');
        }}
        ListHeaderComponent={<CategoryFilters f={f} count={f.products ? f.products.length : undefined} />}
      />
    </PageShell>
  );
}

export default withStackTabBar(CategoryScreen);
