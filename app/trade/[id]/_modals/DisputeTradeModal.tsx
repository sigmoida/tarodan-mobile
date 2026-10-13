import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Button, Input, Text, theme, ButtonRow } from '@/ui';
import type { TFn } from '../_lib/types';

import {
  DISPUTE_REASONS,
  DISPUTE_REASON_LABEL_KEY,
  type DisputeReason,
} from '../_lib/disputeReasons';

export function DisputeTradeModal({
  visible,
  onClose,
  reason,
  setReason,
  description,
  setDescription,
  onSubmit,
  isPending,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  reason: DisputeReason;
  setReason: (v: DisputeReason) => void;
  description: string;
  setDescription: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: TFn;
}) {
  const reasons: [DisputeReason, string][] = DISPUTE_REASONS.map((value) => [
    value,
    t(DISPUTE_REASON_LABEL_KEY[value]),
  ]);

  return (
    <Modal isOpen={visible} onClose={() => !isPending && onClose()} title={t('trade.dispute.modalTitle')}>
      <Text variant="caption" style={{ marginBottom: theme.spacing[3] }} tone="muted">{t('trade.dispute.modalIntro')}</Text>
      <View style={{ marginBottom: theme.spacing[3] }}>
        {reasons.map(([value, label]) => (
          <Button
            key={value}
            variant={reason === value ? 'primary' : 'outline'}
            title={label}
            onPress={() => setReason(value)}
            style={{ marginBottom: theme.spacing[1.5] }}
          />
        ))}
      </View>
      <Input
        label={t('trade.dispute.descriptionLabel')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder={t('trade.dispute.descriptionPlaceholder')}
        containerStyle={{ marginBottom: theme.spacing[3] }}
        inputStyle={{ minHeight: 100 }}
      />
      <ButtonRow style={{ marginTop: theme.spacing[2] }}>
        <Button variant="outline" title={t('trade.dispute.cancelCta')} onPress={onClose} disabled={isPending} />
        <Button variant="primary" title={t('trade.dispute.submitCta')} onPress={onSubmit} isLoading={isPending} />
      </ButtonRow>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing[3], marginTop: theme.spacing[2] },
});
