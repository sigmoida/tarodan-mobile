import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, PageHeader, PAGE_GUTTER } from '@/ui';
import { ActiveFilterChips, ProductListControls } from '@/components/product';
import { AdBanner } from '@/components/ads/AdBanner';
import type { AdSession } from '@/lib/ads/useAdSession';
import type { ListingsController } from '../_hooks/useListings';
import { styles } from '../_lib/styles';

/**
 * Liste tepesi (web `ListingsClient`): header reklam yuvası, başlık bandı (arama → "“x” araması",
 * yoksa marka/kategori, yoksa "Tüm İlanlar"; altında ürün sayısı; filtre + sıralama), arama kutusu
 * ve aktif filtre çipleri. Liste içeriği yatay boşluk verdiği için reklam yuvasının boşluğu geri alınır.
 */
export function ListingsHeader({ f, session }: { f: ListingsController; session: AdSession }) {
  const { t } = useTranslation();
  const search = f.filters.search;
  const title = search
    ? t('product.searchResultsFor', { query: search })
    : f.filters.brand || f.filters.category || t('seller.allListings');

  return (
    <View style={styles.header}>
      <View style={{ marginHorizontal: -PAGE_GUTTER }}>
        <AdBanner position="header" session={session} />
      </View>
      <PageHeader
        title={title}
        description={`${f.total} ${t('product.productsFound')}`}
        actions={
          <ProductListControls
            sortLabel={f.getSortLabel()}
            onSort={() => f.setSortMenuVisible(true)}
            onFilter={() => f.setFilterModalVisible(true)}
            filterCount={f.activeFilterCount}
            layout={f.layout}
            onLayoutChange={f.setLayout}
          />
        }
      />
      <Input
        placeholder={t('nav.searchPlaceholderMobile')}
        value={f.searchQuery}
        onChangeText={f.setSearchQuery}
        onSubmitEditing={f.applySearch}
        returnKeyType="search"
        leftIconName="search"
      />
      <ActiveFilterChips chips={f.activeChips} onClear={f.clearFilters} />
    </View>
  );
}
