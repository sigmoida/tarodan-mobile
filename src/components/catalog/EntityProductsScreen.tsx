import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ProductGrid } from '@/components/product';
import { withStackTabBar } from '@/components/shell/StackTabBar';
import { useTabBarPageScroll } from '@/components/shell/TabBarCollapse';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { EntityLogo } from './EntityLogo';
import { useEntityProducts, type CatalogEntityKind } from './useEntityProducts';

const { spacing } = theme;

/**
 * Brand / manufacturer detail (web `ManufacturerDetailClient`): PageShell (name in the top bar) + logo and
 * the muted "N active listings" line, with the entity's products below in one product grid.
 * `/brands/:slug` and `/ureticiler/:slug` share this screen; only the API and the empty-state copy differ.
 * Floating bottom tab bar (`withStackTabBar`) like the category screen: one scroll handler collapses it
 * (`useTabBarPageScroll`) and the grid keeps `useTabBarInset()` as bottom padding, so rows and the
 * list-placed empty / error states clear the bar.
 */
function EntityProductsBody({ kind }: { kind: CatalogEntityKind }) {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const f = useEntityProducts(kind, slug);
  const { entity } = f;
  const isBrand = kind === 'brand';
  const page = useTabBarPageScroll();
  const tabInset = useTabBarInset();

  return (
    <PageShell
      title={entity?.name || (isBrand ? t('product.brand') : t('product.manufacturer'))}
      mode="list"
      scroll={page}
    >
      <ProductGrid
        scroll={page}
        bottomInset={tabInset}
        items={f.products}
        loading={f.loading}
        refreshing={f.refreshing}
        onRefresh={f.refetch}
        onEndReached={f.loadMore}
        loadingMore={f.loadingMore}
        loadMoreFailed={f.loadMoreFailed}
        onRetryLoadMore={f.retryLoadMore}
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

export const EntityProductsScreen = withStackTabBar(EntityProductsBody);

const styles = StyleSheet.create({
  header: { gap: spacing[2] },
});
