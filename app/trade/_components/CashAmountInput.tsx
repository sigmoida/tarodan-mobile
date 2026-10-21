import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Input, theme } from '@/ui';

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
 * previous value and shows a warning until the next accepted change. The helper always shows.
 */
export function CashAmountInput({ label, value, onChange }: CashAmountInputProps) {
  const { t } = useTranslation();
  const [refused, setRefused] = useState(false);

  return (
    <>
      <Input
        label={label}
        value={value}
        onChangeText={(typed: string) => {
          setRefused(isCashInputRefused(typed));
          onChange((previous) => nextCashInput(previous, typed));
        }}
        keyboardType="numeric"
        helperText={t('trade.cashHelper')}
        containerStyle={styles.field}
      />
      {refused ? <Alert variant="warning">{t('trade.cashFormatRefused')}</Alert> : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: theme.spacing[3],
  },
});
