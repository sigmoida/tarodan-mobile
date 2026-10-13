import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { SimilarProductsCard } from '@/components/product';
import { useUnavailableProduct } from './_hooks/useUnavailableProduct';

const { colors, spacing, radiusRole } = theme;

/**
 * Satışta olmayan ürün: sade durum bandı (tekrar stokta ya da artık yok) + kategori/ürün aksiyonu ve
 * benzer ürünler. Kutlama ikonu/emoji yok; durum yalnız metin.
 */
export default function ProductUnavailableScreen() {
  const { t } = useTranslation();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const id = String(productId ?? '');
  const { product, similar, loading, isBackInStock } = useUnavailableProduct(id);

  return (
    <PageShell
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
        ) : product?.category?.slug ? (
          <Button fullWidth onPress={() => router.push(`/category/${product.category!.slug}` as any)}>
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
