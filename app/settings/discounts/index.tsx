import { useTranslation } from 'react-i18next';
import { ChipTabs, FAB, EmptyState } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';

import { styles } from './_lib/styles';
import { FILTERS } from './_lib/types';
import { useDiscounts } from './_hooks/useDiscounts';
import { DiscountsGate } from './_components/DiscountsGate';
import { DiscountCard } from './_components/DiscountCard';

/**
 * Seller discount management — THIN screen. The `useDiscounts` controller owns
 * the list query, filter, navigation to the form screens (`new`, `[id]/edit`)
 * and delete/toggle mutations. This file composes the gate, filter chips,
 * list and FAB.
 */
export default function DiscountsScreen() {
  const { t } = useTranslation();
  const f = useDiscounts();

  const gate = DiscountsGate();
  if (gate) return gate;

  return (
    <PageShell
      title={t('discount.myDiscountsTitle')}
      loading={f.discountsQuery.isLoading}
      loadingFallback={<RowListSkeleton rows={3} />}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        <FAB
          icon="plus"
          accessibilityLabel={t('discount.createNewA11y')}
          style={styles.fab}
          onPress={f.openCreate}
        />
      }
    >
      <ChipTabs
        testID="discount-filters"
        value={f.filter}
        onChange={f.setFilter}
        items={FILTERS.map((opt) => ({ key: opt.value, label: t(opt.labelKey) }))}
      />

      {f.filteredDiscounts.length === 0 ? (
        <EmptyState
          icon="tag"
          title={t('discount.emptyTitle')}
          subtitle={t('discount.emptySubtitle')}
          actionLabel={t('discount.newTitle')}
          onAction={f.openCreate}
        />
      ) : (
        f.filteredDiscounts.map((d) => (
          <DiscountCard
            key={d.id}
            d={d}
            onToggle={(isActive) => f.toggleActiveMutation.mutate({ id: d.id, isActive })}
            onEdit={() => f.openEdit(d)}
            onDelete={() => f.handleDelete(d)}
          />
        ))
      )}
    </PageShell>
  );
}
