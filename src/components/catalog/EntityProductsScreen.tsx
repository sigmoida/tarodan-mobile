import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RawText, Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ProductGrid } from '@/components/product';
import { resolveImageUrl } from '@/utils/imageUrl';
import { useEntityProducts, type CatalogEntityKind } from './useEntityProducts';

const { colors, spacing, typography, radiusRole } = theme;

/**
 * Marka / üretici detayı (web `ManufacturerDetailClient`): PageShell (ad üst barda) + logo ve "N Aktif
 * ilanlar" muted satırı, altında üreticinin ürünleri tek ürün ızgarasında. `/brands/:slug` ve
 * `/ureticiler/:slug` aynı ekranı kullanır; fark yalnız API ve boş durum metni.
 */
export function EntityProductsScreen({ kind }: { kind: CatalogEntityKind }) {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const f = useEntityProducts(kind, slug);
  const { entity } = f;
  const isBrand = kind === 'brand';

  return (
    <PageShell
      title={entity?.name || (isBrand ? t('product.brand') : t('product.manufacturer'))}
      mode="list"
    >
      <ProductGrid
        items={f.products}
        loading={f.loading}
        refreshing={f.isRefetching}
        onRefresh={f.refetch}
        errorMessage={f.error ? t('collection.productsLoadFailed') : null}
        onRetry={f.refetch}
        emptyTitle={isBrand ? t('brands.emptyProductsTitle') : t('product.noManufacturerProducts')}
        emptySubtitle={t('product.moreProductsComingSoon')}
        ListHeaderComponent={
          entity ? (
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                {entity.logo ? (
                  <Image source={{ uri: resolveImageUrl(entity.logo) }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <RawText style={styles.logoFallback}>{entity.name.charAt(0).toUpperCase()}</RawText>
                )}
              </View>
              {typeof entity.productCount === 'number' ? (
                <Text variant="caption" tone="muted" testID="entity-product-count">
                  {entity.productCount} {t('brands.activeListings')}
                </Text>
              ) : null}
            </View>
          ) : null
        }
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[2] },
  logoWrap: {
    alignSelf: 'flex-start',
    width: spacing[20],
    height: spacing[20],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: spacing[16], height: spacing[16] },
  logoFallback: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
});
