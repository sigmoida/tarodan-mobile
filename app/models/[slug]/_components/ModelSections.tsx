import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, SectionCard, SkeletonCard, Text, gridCellStyle, useGridColumns } from '@/ui';
import { ProductCard } from '@/components/product';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import { styles } from '../_lib/styles';
import type { CarModelDetail } from '../_lib/types';
import type { ModelDetailController } from '../_hooks/useModelDetail';

/** Model başlığı: kapak görseli, marka, model adı, yıllar ve açıklama. */
export function ModelHero({ model }: { model: CarModelDetail }) {
  const { t } = useTranslation();
  return (
    <View style={styles.hero}>
      <View style={styles.heroImage}>
        {model.image ? (
          <AppImage source={model.image} variant="detail" style={styles.heroImageFill} resizeMode="cover" />
        ) : null}
      </View>
      <View style={styles.brandRow}>
        {model.brand?.logo ? (
          <AppImage source={model.brand.logo} style={styles.brandLogo} />
        ) : null}
        <Text variant="bodySm" tone="muted" weight="medium">
          {model.brand?.name}
        </Text>
      </View>
      {model.yearStart || model.yearEnd ? (
        <Text variant="bodySm" tone="subtle">
          {model.yearStart ?? '?'}
          {model.yearEnd ? ` - ${model.yearEnd}` : ` - ${t('models.present')}`}
        </Text>
      ) : null}
      {model.description ? (
        <Text variant="bodySm" tone="muted">
          {model.description}
        </Text>
      ) : null}
    </View>
  );
}

/** Bu modele ait diecast ürünler (tek ProductCard, 2 sütun). */
export function ModelProductsGrid({ f }: { f: ModelDetailController }) {
  const { t } = useTranslation();
  const { model, products, productsQuery } = f;
  const favoriteProps = useProductCardFavorites();
  const columns = useGridColumns();

  return (
    <SectionCard
      title={t('models.diecastModelsFor', { name: model?.name ?? '' })}
      action={
        <Text variant="caption" tone="muted">
          {productsQuery.isLoading ? '...' : t('collection.itemCountSuffix', { count: products.length })}
        </Text>
      }
    >
      {productsQuery.isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: columns }, (_, i) => (
            <View key={i} style={gridCellStyle(i, columns)}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : productsQuery.isError && products.length === 0 ? (
        <ErrorState placement="inline" onRetry={() => productsQuery.refetch()} testID="model-products-error" />
      ) : products.length === 0 ? (
        <EmptyState icon="cube" title={t('home.noProductsYet')} subtitle={t('models.noProductsForModel')} />
      ) : (
        <View style={styles.grid}>
          {products.map((p, index) => (
            <View key={p.id} style={gridCellStyle(index, columns)}>
              <ProductCard product={p} {...favoriteProps(p)} />
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
