import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, Input } from '@/ui';
import { ProductListToolbar } from '@/components/product';
import { SCALES } from '@/theme/catalog';
import { styles } from '../_lib/styles';
import type { CategoryController } from '../_hooks/useCategory';

/**
 * Liste başlığı: ortak `ProductListToolbar` (arama → sıralama + ızgara/liste → ölçek çipleri →
 * sonuç sayısı). Kategori ekranında filtre paneli yok; ölçek çipleri araç çubuğunun `extra` satırı.
 */
export function CategoryFilters({ f, count }: { f: CategoryController; count?: number }) {
  const { t } = useTranslation();
  return (
    <ProductListToolbar
      style={styles.filterSection}
      search={
        <Input
          placeholder={t('common.search')}
          value={f.searchQuery}
          onChangeText={f.setSearchQuery}
          leftIconName="magnifying-glass"
        />
      }
      sortLabel={f.getSortLabel()}
      onSort={() => f.setSortMenuVisible(true)}
      layout={f.layout}
      onLayoutChange={f.setLayout}
      extra={
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scaleChips}
        >
          <Chip label={t('common.all')} selected={!f.selectedScale} onPress={() => f.setSelectedScale('')} />
          {SCALES.slice(0, 6).map((scale) => (
            <Chip
              key={scale.id}
              label={scale.name}
              selected={f.selectedScale === scale.id}
              onPress={() => f.setSelectedScale(f.selectedScale === scale.id ? '' : scale.id)}
            />
          ))}
        </ScrollView>
      }
      resultLabel={count != null ? t('product.productsFoundCount', { count }) : undefined}
    />
  );
}
