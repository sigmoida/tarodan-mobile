import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ProductGrid } from '@/components/product';
import { EntityLogo } from './EntityLogo';
import { useEntityProducts, type CatalogEntityKind } from './useEntityProducts';

const { spacing } = theme;

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
              <EntityLogo logo={entity.logo} name={entity.name} size="lg" testID="entity-logo" />
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
});
