import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, TopBarLabel, pageListContentStyle, usePageScrollHandler } from '@/ui';
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
  const { products, isLoading } = useDiscountProducts(true);
  const selectedIds = useProductPickerDraft((s) => s.selectedIds);
  const toggle = useProductPickerDraft((s) => s.toggle);
  const page = usePageScrollHandler();
  const title = t('discount.pickProducts');

  const renderProduct = useCallback(
    ({ item }: { item: (typeof products)[number] }) => (
      <ProductPickRow product={item} checked={selectedIds.includes(item.id)} onToggle={toggle} />
    ),
    [selectedIds, toggle],
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
        {...page.listProps}
        data={products}
        keyExtractor={productKey}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
        ListEmptyComponent={
          <EmptyState placement="list" icon="cube" title={t('discount.noActiveProducts')} subtitle={t('home.noProductsYetHint')} />
        }
        renderItem={renderProduct}
      />
    </PageShell>
  );
}
