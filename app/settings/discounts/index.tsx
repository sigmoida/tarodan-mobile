import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, FAB, Snackbar, EmptyState, ScreenLoader } from '@/ui';
import { ScreenHeader } from '@/components/common';

import { ThemedRefreshControl } from '@/components/common';
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
 * gate, filter chips, list, FAB, and modal.
 */
export default function DiscountsScreen() {
  const { t } = useTranslation();
  const f = useDiscounts();

  const gate = DiscountsGate({ f });
  if (gate) return gate;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('discount.myDiscountsTitle')} />

      <View style={styles.filterRow}>
        {FILTERS.map((opt) => (
          <Chip
            key={opt.value}
            label={t(opt.labelKey)}
            selected={f.filter === opt.value}
            variant={f.filter === opt.value ? 'primary' : 'neutral'}
            onPress={() => f.setFilter(opt.value)}
          />
        ))}
      </View>

      {f.discountsQuery.isLoading ? (
        <ScreenLoader />
      ) : f.filteredDiscounts.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title={t('discount.emptyTitle')}
          subtitle={t('discount.emptySubtitle')}
          actionLabel={t('discount.newTitle')}
          onAction={f.openCreate}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
        >
          {f.filteredDiscounts.map((d) => (
            <DiscountCard
              key={d.id}
              d={d}
              onToggle={(isActive) => f.toggleActiveMutation.mutate({ id: d.id, isActive })}
              onEdit={() => f.openEdit(d)}
              onDelete={() => f.handleDelete(d)}
            />
          ))}
        </ScrollView>
      )}

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

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ visible: false, message: '' })}
        duration={2000}
        variant="success"
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
