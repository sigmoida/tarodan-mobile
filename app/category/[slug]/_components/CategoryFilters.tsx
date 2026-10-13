import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, Input, Text } from '@/ui';
import { ProductListControls } from '@/components/product';
import { SCALES } from '@/theme/catalog';
import { styles } from '../_lib/styles';
import type { CategoryController } from '../_hooks/useCategory';

/** Liste başlığı: arama + sıralama + ölçek çipleri + sonuç sayısı. */
export function CategoryFilters({ f, count }: { f: CategoryController; count?: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.filterSection}>
      <Input
        placeholder={t('common.search')}
        value={f.searchQuery}
        onChangeText={f.setSearchQuery}
        leftIconName="search"
      />

      <ProductListControls sortLabel={f.getSortLabel()} onSort={() => f.setSortMenuVisible(true)} />

      {/* Scale Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scaleChips}>
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

      {count != null ? (
        <Text variant="bodySm" tone="muted">
          {t('product.productsFoundCount', { count })}
        </Text>
      ) : null}
    </View>
  );
}
