import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, theme } from '@/ui';
import { ProductCard, type ProductCardProduct } from './ProductCard';

const { spacing } = theme;

/**
 * "Benzer Ürünler" kartı (web `ProductRelated`): SectionCard içinde 2 sütun ürün kartı. `emptyText`
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
  if (list.length === 0 && !emptyText) return null;
  return (
    <SectionCard title={title} testID={testID}>
      {list.length === 0 ? (
        <EmptyState placement="inline" icon="cube" title={emptyText ?? ''} subtitle={t('home.noProductsYetHint')} />
      ) : (
        <View style={styles.grid}>
          {list.map((product) => (
            <View key={product.id} style={styles.cell}>
              <ProductCard product={product} showMeta={false} />
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  cell: { width: '48%' },
});
