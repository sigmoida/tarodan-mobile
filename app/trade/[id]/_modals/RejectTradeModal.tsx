import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Text, theme, ButtonRow } from '@/ui';

export function RejectTradeModal({
  visible,
  onClose,
  reason,
  setReason,
  onSubmit,
  isPending,
}: {
  visible: boolean;
  onClose: () => void;
  reason: string;
  setReason: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={visible} onClose={() => !isPending && onClose()} title={t('trade.rejectTradeTitle')}>
      <Text variant="caption" tone="muted" style={{ marginBottom: theme.spacing[3] }}>
        {t('trade.rejectModalDesc')}
      </Text>
      <Input
        label={t('trade.rejectReason')}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        placeholder={t('trade.rejectReasonPlaceholder')}
        containerStyle={{ marginBottom: theme.spacing[3] }}
        inputStyle={{ minHeight: 80 }}
      />
      <ButtonRow style={{ marginTop: theme.spacing[2] }}>
        <Button variant="outline" title={t('trade.dispute.cancelCta')} onPress={onClose} disabled={isPending} />
        <Button
          variant="danger"
          title={t('trade.rejectTrade')}
          onPress={onSubmit}
          isLoading={isPending}
        />
      </ButtonRow>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing[3], marginTop: theme.spacing[2] },
});
