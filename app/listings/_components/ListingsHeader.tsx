import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, PAGE_GUTTER } from '@/ui';
import { ProductListToolbar } from '@/components/product';
import { AdBanner } from '@/components/ads/AdBanner';
import type { AdSession } from '@/lib/ads/useAdSession';
import type { ListingsController } from '../_hooks/useListings';
import { styles } from '../_lib/styles';

/**
 * Liste tepesi (web `ListingsClient`): header reklam yuvası ve ortak `ProductListToolbar`
 * (arama kutusu → filtre + sıralama + ızgara/liste → ürün sayısı → aktif filtre çipleri). Sayfa
 * başlığı üst barda (PageShell) olduğu için içerikte tekrar edilmez. Liste içeriği yatay boşluk
 * verdiği için reklam yuvasının boşluğu geri alınır.
 */
export function ListingsHeader({ f, session }: { f: ListingsController; session: AdSession }) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={{ marginHorizontal: -PAGE_GUTTER }}>
        <AdBanner position="header" session={session} />
      </View>
      <ProductListToolbar
        search={
          <Input
            placeholder={t('nav.searchPlaceholderMobile')}
            value={f.searchQuery}
            onChangeText={f.setSearchQuery}
            onSubmitEditing={f.applySearch}
            returnKeyType="search"
            leftIconName="magnifying-glass"
          />
        }
        sortLabel={f.getSortLabel()}
        onSort={() => f.setSortMenuVisible(true)}
        onFilter={() => f.setFilterModalVisible(true)}
        filterCount={f.activeFilterCount}
        layout={f.layout}
        onLayoutChange={f.setLayout}
        resultLabel={f.isLoading ? undefined : t('product.productsFoundCount', { count: f.total })}
        chips={f.activeChips}
        onClearFilters={f.clearFilters}
      />
    </View>
  );
}
