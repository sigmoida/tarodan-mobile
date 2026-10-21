import React from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, Spinner, Text } from '@/ui';

import { TradePickCard } from '@/components/trade/TradePickCard';
import { styles } from '../_lib/styles';
import { itemId, type TradeItem } from '../_lib/types';

/** Başlıklı, çoklu seçimli takas ürün listesi — yeni takas teklifiyle aynı `TradePickCard`. */
export function TradeProductPicker({
  title,
  subtitle,
  products,
  isLoading,
  selected,
  toggle,
}: {
  title: string;
  subtitle: string;
  products: any[];
  /** Loading wins over the empty state (see `isPickerLoading`). */
  isLoading: boolean;
  selected: TradeItem[];
  toggle: (p: any) => void;
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
        products.map((p) => (
          <TradePickCard
            key={p.id}
            product={p}
            selected={!!selected.find((x) => itemId(x) === p.id)}
            onToggle={() => toggle(p)}
          />
        ))
      )}
    </SectionCard>
  );
}
