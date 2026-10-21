import React from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, Spinner, Text } from '@/ui';

import { TradePickCard } from '@/components/trade/TradePickCard';
import { ShowMoreButton } from '../../../_components/ShowMoreButton';
import { styles } from '../_lib/styles';
import type { CounterProduct } from '../_lib/counterProducts';

/** Titled, multi-select trade product list; the same `TradePickCard` as the new trade offer. */
export function TradeProductPicker({
  title,
  subtitle,
  products,
  isLoading,
  selected,
  toggle,
  hasMore,
  isLoadingMore,
  onLoadMore,
  showMoreTestID,
}: {
  title: string;
  subtitle: string;
  products: CounterProduct[];
  /** Loading wins over the empty state (see `isPickerLoading`). */
  isLoading: boolean;
  selected: CounterProduct[];
  toggle: (p: CounterProduct) => void;
  /** More pages exist on the server: show the "Show more" button. */
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  showMoreTestID?: string;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title}>
      <Text variant="caption" tone="muted" style={styles.pickerSubtitle}>{subtitle}</Text>
      {isLoading ? (
        <Spinner size="md" style={styles.spinner} />
      ) : products.length === 0 ? (
        <EmptyState placement="inline" icon="arrows-right-left" title={t('trade.noEligibleProducts')} subtitle={t('emptyState.tradeEligibleHint')} />
      ) : (
        <>
          {products.map((p) => (
            <TradePickCard
              key={p.id}
              product={p}
              selected={selected.some((x) => x.id === p.id)}
              onToggle={() => toggle(p)}
            />
          ))}
          <ShowMoreButton
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onPress={onLoadMore}
            testID={showMoreTestID}
          />
        </>
      )}
    </SectionCard>
  );
}
