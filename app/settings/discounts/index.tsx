import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, FAB, EmptyState } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';

import { styles } from './_lib/styles';
import { FILTERS } from './_lib/types';
import { useDiscounts } from './_hooks/useDiscounts';
import { DiscountsGate } from './_components/DiscountsGate';
import { DiscountCard } from './_components/DiscountCard';
import { DiscountFormModal } from './_modals/DiscountFormModal';

/**
 * Seller discount management — THIN screen. The `useDiscounts` controller owns
 * the list query, filter, form modal open state, and delete/toggle mutations;
 * the form modal owns its own form + save mutation. This file composes the
 * gate, filter chips, list, FAB, and modal (PageShell `overlay` slot).
 */
export default function DiscountsScreen() {
  const { t } = useTranslation();
  const f = useDiscounts();

  const gate = DiscountsGate({ f });
  if (gate) return gate;

  return (
    <PageShell
      title={t('discount.myDiscountsTitle')}
      loading={f.discountsQuery.isLoading}
      loadingFallback={<RowListSkeleton rows={3} />}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        <>
          <FAB
            icon="add"
            accessibilityLabel={t('discount.createNewA11y')}
            style={styles.fab}
            onPress={f.openCreate}
          />

          <DiscountFormModal
            visible={f.formOpen}
            discount={f.editing}
            onClose={f.closeForm}
            onSaved={f.showSaved}
          />
        </>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((opt) => (
          <Chip
            key={opt.value}
            label={t(opt.labelKey)}
            selected={f.filter === opt.value}
            variant={f.filter === opt.value ? 'primary' : 'neutral'}
            onPress={() => f.setFilter(opt.value)}
          />
        ))}
      </ScrollView>

      {f.filteredDiscounts.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
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
