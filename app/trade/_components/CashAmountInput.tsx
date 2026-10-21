import React, { useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, theme } from '@/ui';

import { isCashInputRefused, nextCashInput } from '../_lib/cash';

type CashAmountInputProps = {
  label: string;
  value: string;
  /** The controller's state setter; takes an updater so each change builds on the latest value. */
  onChange: (update: (previous: string) => string) => void;
};

/**
 * The cash amount field of a trade offer, shared by the new-trade wizard and the counter offer.
 * Typed or pasted text goes through the `nextCashInput` mask; a change the mask refuses keeps the
 * previous value and shows the refusal in the field's error slot until the next accepted change.
 * As on web (`Input` with `helperText` and `error`), the error takes the helper's place while it
 * shows. The field text does not change on a refusal, so the refusal is also announced to screen
 * readers when it first appears.
 */
export function CashAmountInput({ label, value, onChange }: CashAmountInputProps) {
  const { t } = useTranslation();
  const [refused, setRefused] = useState(false);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={(typed: string) => {
        const nowRefused = isCashInputRefused(typed);
        if (nowRefused && !refused) {
          AccessibilityInfo.announceForAccessibility?.(t('trade.cashFormatRefused'));
        }
        setRefused(nowRefused);
        onChange((previous) => nextCashInput(previous, typed));
      }}
      keyboardType="numeric"
      helperText={t('trade.cashHelper')}
      error={refused ? t('trade.cashFormatRefused') : undefined}
      containerStyle={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: theme.spacing[3],
  },
});
