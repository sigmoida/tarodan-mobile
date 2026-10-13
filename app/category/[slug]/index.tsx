import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { ProductGrid, ProductSortModal } from '@/components/product';
import { useCategory } from './_hooks/useCategory';
import { CategoryFilters } from './_components/CategoryFilters';

/**
 * Kategori — PageShell + tek ürün ızgarası (`ProductGrid`): ortak `ProductListToolbar` (arama, sıralama,
 * ızgara/liste, ölçek çipleri, sonuç sayısı) liste başlığında. Kontrolcü `useCategory`; ekran yalnız kompozisyon.
 */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const f = useCategory();

  return (
    <PageShell
      title={f.category?.name || t('common.category')}
      mode="list"
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
        loading={f.isLoading}
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
