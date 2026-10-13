import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, SkeletonCard, Text } from '@/ui';
import { ProductCard } from '@/components/product';
import { transformImageUrl } from '@/utils/imageUrl';
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
          <Image source={{ uri: transformImageUrl(model.image) }} style={styles.heroImageFill} resizeMode="cover" />
        ) : null}
      </View>
      <View style={styles.brandRow}>
        {model.brand?.logo ? (
          <Image source={{ uri: transformImageUrl(model.brand.logo) }} style={styles.brandLogo} />
        ) : null}
        <Text variant="bodySm" tone="muted" weight="medium">
          {model.brand?.name}
        </Text>
      </View>
      <Text variant="h1" accessibilityRole="header">
        {model.name}
      </Text>
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
          <View style={styles.cell}>
            <SkeletonCard />
          </View>
          <View style={styles.cell}>
            <SkeletonCard />
          </View>
        </View>
      ) : products.length === 0 ? (
        <EmptyState size="compact" icon="cube" title={t('home.noProductsYet')} subtitle={t('models.noProductsForModel')} />
      ) : (
        <View style={styles.grid}>
          {products.map((p) => (
            <View key={p.id} style={styles.cell}>
              <ProductCard product={p} />
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
