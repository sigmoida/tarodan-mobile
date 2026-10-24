import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, gridCellStyle, theme, useGridColumns } from '@/ui';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { ProductCard, type ProductCardProduct } from './ProductCard';

const { spacing } = theme;

/**
 * "Benzer Ürünler" kartı (web `ProductRelated`): SectionCard içinde ürün kartı ızgarası (telefonda 2
 * sütun, tablette daha fazla). `emptyText`
 * verilmezse liste boşken kart hiç çizilmez (ürün detayı); verilirse bu metinle çizilir (stok-yok ekranı).
 */
export function SimilarProductsCard({
  title,
  items,
  emptyText,
  testID = 'product-similar',
}: {
  title: string;
  items: ProductCardProduct[] | undefined;
  emptyText?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const list = items ?? [];
  const favoriteProps = useProductCardFavorites();
  const columns = useGridColumns();
  if (list.length === 0 && !emptyText) return null;
  return (
    <SectionCard title={title} testID={testID}>
      {list.length === 0 ? (
        <EmptyState placement="inline" icon="cube" title={emptyText ?? ''} subtitle={t('home.noProductsYetHint')} />
      ) : (
        <View style={styles.grid}>
          {list.map((product, index) => (
            <View key={product.id} style={gridCellStyle(index, columns)}>
              <ProductCard product={product} showMeta={false} {...favoriteProps(product)} />
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  // Cells sized by `gridCellStyle` (columns from the window width; 48% / 4% on phones).
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing[3] },
});
