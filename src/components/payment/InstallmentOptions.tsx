import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ListRowCard, RadioIndicator, SkeletonLine, Text, theme, useDelayedLoading } from '@/ui';
import type { InstallmentOption } from '@/types/installments';
import type { InstallmentOffer } from '@/lib/payment/installments';
import type { InstallmentOptionsState } from '@/lib/payment/useInstallmentOptions';
import { formatPrice } from '@/utils/format';

const { colors, spacing } = theme;

/** `InstallmentOptions` input: `enterCard` before 8 digits of a new card, else the hook state. */
export type InstallmentOptionsView = { status: 'enterCard' } | InstallmentOptionsState;

type Props = {
  view: InstallmentOptionsView;
  selectedCount: number;
  onSelect: (count: number) => void;
  /** The card the view belongs to: a new card's result is announced even with the same text. */
  cardKey?: string | null;
};

/** "world" -> "World": PayTR names families in lower case; the bank name is shown as sent. */
function cardLine(card: Extract<InstallmentOffer, { kind: 'options' }>['card']): string {
  const family = card?.family ? card.family.charAt(0).toUpperCase() + card.family.slice(1) : '';
  return [card?.bank, family].filter(Boolean).join(' · ');
}

/**
 * Installment selector of the pay screen (plan 6.2 / 6.3, web `InstallmentOptions`): a radio
 * group, single payment first and preselected; each count shows "N x monthly", the total and the
 * installment fee ("Vade farksız" when it is 0). Not eligible / below minimum / unavailable is a
 * one-line note and the single payment stays payable. Presentational: the state comes from
 * `useInstallmentOptions`, amounts from the server.
 *
 * Accessibility: the group has a visible title; every option is a 44 pt `radio` with its checked
 * state and a name holding count, monthly and total; loaded options and notes are announced.
 */
export function InstallmentOptions({ view, selectedCount, onSelect, cardKey = null }: Props) {
  const { t } = useTranslation();
  const showSkeleton = useDelayedLoading(view.status === 'loading');
  const offer = view.status === 'done' ? view.offer : null;

  const note = (() => {
    if (view.status === 'enterCard') return t('payment.installments.enterCard');
    if (offer?.kind !== 'single') return null;
    switch (offer.reason) {
      case 'card_not_eligible':
        return t('payment.installments.notEligible');
      case 'not_offered_for_payment':
        return t('payment.installments.notOffered');
      case 'below_minimum':
        return t('payment.installments.belowMinimum', { amount: formatPrice(offer.minAmount) });
      default:
        return t('payment.installments.unavailable');
    }
  })();

  // Screen readers hear the result of a card change (web: aria-live="polite").
  const announcement = offer?.kind === 'options' ? t('payment.installments.title') : view.status === 'done' ? note : null;
  useEffect(() => {
    if (announcement) AccessibilityInfo.announceForAccessibility?.(announcement);
  }, [announcement, cardKey]);

  if (offer?.kind === 'hidden') return null;

  const optionText = (o: InstallmentOption) => {
    const title = o.count === 1 ? t('payment.installments.single') : t('payment.installments.count', { count: o.count });
    const monthly =
      o.count === 1 ? null : t('payment.installments.monthly', { count: o.count, amount: formatPrice(o.monthlyAmount) });
    const total = t('payment.installments.total', { amount: formatPrice(o.totalAmount) });
    const fee =
      o.count === 1
        ? null
        : o.feeAmount > 0
          ? t('payment.installments.fee', { amount: formatPrice(o.feeAmount) })
          : t('payment.installments.noFee');
    return { title, monthly, total, fee };
  };

  return (
    <View style={styles.section} testID="installment-options">
      <Text variant="label" tone="heading" nativeID="installment-options-title">
        {t('payment.installments.title')}
      </Text>

      {view.status === 'loading' ? (
        showSkeleton ? (
          <ListRowCard testID="installment-options-loading">
            <View style={styles.skeleton} accessible accessibilityLabel={t('payment.installments.loading')}>
              <SkeletonLine variant="body" width="45%" />
              <SkeletonLine variant="bodySm" width="70%" />
            </View>
          </ListRowCard>
        ) : null
      ) : offer?.kind === 'options' ? (
        <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabelledBy="installment-options-title">
          {offer.card && cardLine(offer.card) ? (
            <Text variant="caption" tone="muted" testID="installment-card">
              {cardLine(offer.card)}
            </Text>
          ) : null}
          {offer.options.map((o) => {
            const active = o.count === selectedCount;
            const text = optionText(o);
            return (
              <ListRowCard
                key={o.count}
                testID={`installment-option-${o.count}`}
                onPress={() => onSelect(o.count)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={[text.title, text.monthly, text.total, text.fee].filter(Boolean).join(', ')}
                padding={3}
                style={[styles.option, active && styles.optionActive]}
              >
                <RadioIndicator checked={active} color={colors.primary[500]} />
                <View style={styles.optionBody}>
                  <Text variant="bodySm" weight="semibold" tone="heading">
                    {text.title}
                  </Text>
                  {text.monthly ? (
                    <Text variant="caption" tone="muted">
                      {text.monthly}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.optionAmounts}>
                  <Text variant="bodySm" weight="semibold" tone="heading" align="right">
                    {text.total}
                  </Text>
                  {text.fee ? (
                    <Text variant="caption" tone={o.feeAmount > 0 ? 'muted' : 'success'} align="right">
                      {text.fee}
                    </Text>
                  ) : null}
                </View>
              </ListRowCard>
            );
          })}
        </View>
      ) : note ? (
        <Text variant="caption" tone="muted" testID="installment-note">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[2] },
  list: { gap: spacing[2] },
  skeleton: { flex: 1, gap: spacing[1] },
  option: { minHeight: theme.minTouchTarget },
  optionActive: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  optionBody: { flex: 1, minWidth: 0 },
  optionAmounts: { alignItems: 'flex-end' },
});
