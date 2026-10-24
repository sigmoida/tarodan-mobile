import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, TopBarLabel, pageListContentStyle, usePageScrollHandler, usePageContentStyle, useRowGrid } from '@/ui';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { goBackOrHome } from '@/components/common/goBackOrHome';

import { DiscountsGate } from './_components/DiscountsGate';
import { ProductPickRow } from './_components/ProductPickRow';
import { useDiscountProducts } from './_hooks/useDiscountProducts';
import { useProductPickerDraft } from './_lib/productPickerDraft';

const productKey = (p: { id: string }) => p.id;

/**
 * İndirim formunun ürün seçicisi — ayrı ekran (eski modal-içinde-modal yerine).
 * Seçim route-yerel taslakta (`useProductPickerDraft`) canlı tutulur; "Tamam",
 * geri oku ve Android geri tuşu aynı şekilde forma döner, form odakta seçimi alır.
 */
export default function DiscountProductsScreen() {
  const { t } = useTranslation();
  const { products, isLoading, loadFailed, refetch } = useDiscountProducts(true);
  const selectedIds = useProductPickerDraft((s) => s.selectedIds);
  const toggle = useProductPickerDraft((s) => s.toggle);
  const page = usePageScrollHandler();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle(pageListContentStyle);
  // Large screens: the rows become a card grid (src/ui/CLAUDE.md › Large screens).
  const grid = useRowGrid();
  const title = t('discount.pickProducts');

  const renderProduct = useCallback(
    ({ item, index }: { item: (typeof products)[number]; index: number }) =>
      grid.cell(index, <ProductPickRow product={item} checked={selectedIds.includes(item.id)} onToggle={toggle} />),
    [selectedIds, toggle, grid],
  );

  const gate = DiscountsGate({ title });
  if (gate) return gate;

  return (
    <PageShell
      title={title}
      mode="list"
      scroll={page}
      right={selectedIds.length > 0 ? <TopBarLabel>{selectedIds.length}</TopBarLabel> : undefined}
      loading={isLoading}
      loadingFallback={<RowListSkeleton />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('common.ok')}
          onPress={goBackOrHome}
          testID="discount-products-done"
        />
      }
    >
      <Animated.FlatList
        key={grid.listKey}
        numColumns={grid.numColumns}
        {...page.listProps}
        data={products}
        keyExtractor={productKey}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(listContentStyle)}
        ListEmptyComponent={
          loadFailed ? (
            <ErrorState placement="list" onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              placement="list"
              icon="cube"
              title={t('discount.noActiveProducts')}
              subtitle={t('home.noProductsYetHint')}
            />
          )
        }
        renderItem={renderProduct}
      />
    </PageShell>
  );
}
