import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, theme } from '@/ui';

type CashAmountInputProps = {
  label: string;
  /** `useCashAmount().cashAmount` */
  value: string;
  /** `useCashAmount().cashRefused`: the last typed change was refused. */
  refused: boolean;
  /** `useCashAmount().changeCashText` */
  onChangeText: (typed: string) => void;
};

/**
 * The cash amount field of a trade offer, shared by the new-trade wizard and the counter offer.
 * The state and the mask live in `useCashAmount`, so the screens can block sending while a
 * change is refused. As on web (`Input` with `helperText` and `error`), the refusal shows in the
 * field's error slot, in the helper's place, until the next accepted change. A refused change
 * leaves the field text as it was, so the refusal is also announced to screen readers.
 */
export function CashAmountInput({ label, value, refused, onChangeText }: CashAmountInputProps) {
  const { t } = useTranslation();
  const refusedText = t('validation.amountFormatRefused');

  useEffect(() => {
    if (refused) AccessibilityInfo.announceForAccessibility?.(refusedText);
  }, [refused, refusedText]);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      helperText={t('trade.cashHelper')}
      error={refused ? refusedText : undefined}
      containerStyle={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: theme.spacing[3],
  },
});
