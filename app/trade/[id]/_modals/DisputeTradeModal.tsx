import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Button, Input, Text } from '@/ui';
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
      <Text variant="caption" style={{ marginBottom: 12 }}>{t('trade.dispute.modalIntro')}</Text>
      <View style={{ marginBottom: 12 }}>
        {reasons.map(([value, label]) => (
          <Button
            key={value}
            variant={reason === value ? 'primary' : 'outline'}
            title={label}
            onPress={() => setReason(value)}
            style={{ marginBottom: 6 }}
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
        containerStyle={{ marginBottom: 12 }}
        inputStyle={{ minHeight: 100 }}
      />
      <View style={styles.modalActions}>
        <Button variant="outline" title={t('trade.dispute.cancelCta')} onPress={onClose} disabled={isPending} />
        <Button variant="primary" title={t('trade.dispute.submitCta')} onPress={onSubmit} isLoading={isPending} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
});
