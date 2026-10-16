import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import {
  ChipTabs,
  EmptyState,
  TopBarAction,
  pageListContentStyle,
  usePageScrollHandler,
} from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { listWindowing } from '@/lib/list/windowing';

import { FILTERS, type Discount } from './_lib/types';
import { useDiscounts } from './_hooks/useDiscounts';
import { DiscountsGate } from './_components/DiscountsGate';
import { DiscountCard } from './_components/DiscountCard';

const discountKey = (d: Discount) => d.id;

/**
 * Seller discount management — THIN screen. The `useDiscounts` controller owns
 * the list query, filter, navigation to the form screens (`new`, `[id]/edit`)
 * and delete/toggle mutations. This file composes the gate, filter chips and list.
 * "Yeni indirim": boş durumda EmptyState düğmesi; liste doluyken üst bardaki + (yüzen düğme yok).
 * Liste sanallaştırılmıştır (PageShell list modu); indirimler tek sorguda gelir (düzenleme ekranı
 * aynı önbellekten `find` ile okuduğu için sayfalanmaz).
 */
export default function DiscountsScreen() {
  const { t } = useTranslation();
  const f = useDiscounts();
  const page = usePageScrollHandler();
  const { toggleActive, openEdit, handleDelete } = f;
  // Kararlı renderItem (erken return'den ÖNCE — hook sırası sabit).
  const renderDiscount = useCallback(
    ({ item }: { item: Discount }) => (
      <DiscountCard d={item} onToggle={toggleActive} onEdit={openEdit} onDelete={handleDelete} />
    ),
    [toggleActive, openEdit, handleDelete],
  );

  const gate = DiscountsGate();
  if (gate) return gate;

  return (
    <PageShell
      title={t('discount.myDiscountsTitle')}
      mode="list"
      scroll={page}
      loading={f.discountsQuery.isLoading}
      loadingFallback={<RowListSkeleton rows={3} />}
      // Liste alınamadı → "indirim yok" değil, ErrorState + yeniden dene.
      error={(f.discountsQuery.isError && !f.discountsQuery.data) || undefined}
      onRetry={() => f.discountsQuery.refetch()}
      right={
        f.filteredDiscounts.length > 0 ? (
          <TopBarAction
            icon="plus"
            accessibilityLabel={t('discount.createNewA11y')}
            onPress={f.openCreate}
            testID="discount-create"
          />
        ) : undefined
      }
    >
      <Animated.FlatList
        {...page.listProps}
        testID="discounts-list"
        data={f.filteredDiscounts}
        keyExtractor={discountKey}
        renderItem={renderDiscount}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        ListHeaderComponent={
          <ChipTabs
            testID="discount-filters"
            value={f.filter}
            onChange={f.setFilter}
            items={FILTERS.map((opt) => ({ key: opt.value, label: t(opt.labelKey) }))}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="tag"
            title={t('discount.emptyTitle')}
            subtitle={t('discount.emptySubtitle')}
            actionLabel={t('discount.newTitle')}
            onAction={f.openCreate}
          />
        }
      />
    </PageShell>
  );
}
