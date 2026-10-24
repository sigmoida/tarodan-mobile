import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, theme } from '@/ui';
import { negotiatedAmountIssueText, type NegotiatedAmountIssue } from '@/utils/negotiatedAmount';

type CashAmountInputProps = {
  label: string;
  /** `useCashAmount().cashAmount` */
  value: string;
  /** `useCashAmount().cashIssue`: a refused change, or an amount above the API's ceiling. */
  issue: NegotiatedAmountIssue | null;
  /** `useCashAmount().changeCashText` */
  onChangeText: (typed: string) => void;
};

/**
 * The cash amount field of a trade offer, shared by the new-trade wizard and the counter offer.
 * The state and the mask live in `useCashAmount`, so the screens can block sending while a
 * change is refused or the amount is above the API's ceiling. As on web (`Input` with
 * `helperText` and `error`), the issue shows in the field's error slot, in the helper's place,
 * until it is fixed. A refused change leaves the field text as it was, so the issue is also
 * announced to screen readers (once per issue, not on every key).
 */
export function CashAmountInput({ label, value, issue, onChangeText }: CashAmountInputProps) {
  const { t } = useTranslation();
  const issueText = issue ? negotiatedAmountIssueText(issue, t) : undefined;

  useEffect(() => {
    if (issueText) AccessibilityInfo.announceForAccessibility?.(issueText);
  }, [issueText]);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      helperText={t('trade.cashHelper')}
      error={issueText}
      containerStyle={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: theme.spacing[3],
  },
});
