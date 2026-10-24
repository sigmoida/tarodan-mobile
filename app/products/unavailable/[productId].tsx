import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ProductNotFound, SimilarProductsCard } from '@/components/product';
import { searchCategoryHref } from '@/lib/navigation/searchHref';
import { listingIdFromParam } from '@/lib/product/listingParam';
import { useUnavailableProduct } from './_hooks/useUnavailableProduct';

const { colors, spacing, radiusRole } = theme;

/**
 * Listing no longer for sale: a plain status band (back in stock, or gone) with a category or product
 * action and similar listings. No celebration icon or emoji; the state is text only.
 */
function ProductUnavailable({ id }: { id: string }) {
  const { t } = useTranslation();
  const { product, similar, loading, isBackInStock } = useUnavailableProduct(id);

  return (
    <PageShell
      // Similar listings grid: full width on tablets (its columns follow the window).
      contentWidth="full"
      title={t('stockout.page.screenTitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
      loading={loading}
    >
      <View style={styles.hero}>
        <Text testID="unavailable-hero-title" variant="h2" align="center">
          {isBackInStock ? t('stockout.page.titleBack') : t('stockout.page.title')}
        </Text>
        <Text variant="bodySm" tone="muted" align="center">
          {isBackInStock
            ? product?.title
              ? t('stockout.page.bodyBack', { title: product.title })
              : t('stockout.page.bodyBackFallback')
            : product?.title
              ? t('stockout.page.bodyOut', { title: product.title })
              : t('stockout.page.bodyOutFallback')}
        </Text>
        {isBackInStock ? (
          <Button fullWidth onPress={() => router.push(`/product/${id}` as any)}>
            {t('stockout.page.viewProduct')}
          </Button>
        ) : product?.category?.id ? (
          <Button fullWidth onPress={() => router.push(searchCategoryHref({ id: product.category!.id, name: product.category!.name ?? '' }))}>
            {product.category.name
              ? t('stockout.page.allCategory', { category: product.category.name })
              : t('stockout.page.allCategoryFallback')}
          </Button>
        ) : null}
      </View>

      <SimilarProductsCard
        title={t('stockout.page.similar')}
        items={similar}
        emptyText={t('stockout.page.empty')}
        testID="unavailable-similar"
      />
    </PageShell>
  );
}

/**
 * Route entry. `[productId]` comes from a push payload, a checkout stock-out or a deep link, so it is read
 * like a listing URL segment: the uuid is taken out before any request, and no uuid means "not found".
 */
export default function ProductUnavailableScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const id = listingIdFromParam(productId);
  return id ? <ProductUnavailable id={id} /> : <ProductNotFound />;
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'stretch',
    gap: spacing[2],
    padding: spacing[6],
    borderRadius: radiusRole.section,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
});
