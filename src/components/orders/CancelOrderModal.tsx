/**
 * Sipariş iptal formu — üye sipariş detayı ile misafir sipariş takibinin
 * PAYLAŞTIĞI tek modal (web'de `CancelOrderModal` + `GuestCancelModal` aynı
 * neden listesini paylaşıyor; burada tek bileşen ikisini de karşılıyor).
 *
 * Sunum + form; MUTASYON YOK. Çağıran taraf `onConfirm` ile kendi mutation
 * hook'unu bağlar (üye: `useOrderActions`, misafir: `useGuestOrderCancel`).
 * Böylece "her modal kendi mutation'ını taşır" kuralı bozulmadan, iki farklı
 * uca giden aynı form tek yerde kalır.
 *
 * ⚠️ CLAUDE.md §12: mutasyonun `appAlert`'i modal AÇIKKEN patlarsa iOS donuyor.
 * Bu yüzden `onConfirm` çağrılmadan ÖNCE `onClose()` çalışır — sonuç geri
 * bildirimi çağıranın snackbar'ına düşer.
 */
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Select, Textarea, Button, Text, theme } from '@/ui';
import {
  BUYER_SELECTABLE_CANCELLATION_REASONS,
  DEFAULT_CANCELLATION_REASON,
  reasonLabelKey,
  type OrderCancellationReason,
} from '@/lib/shared/orderCancellation';

/** Serbest metin notu — sunucu 500 karakterde kesiyor (`MaxLength(500)`). */
const NOTE_MAX_LENGTH = 500;

export function CancelOrderModal({
  isOpen,
  onClose,
  onConfirm,
  /** Ödemesi alınmış siparişte iade uyarısı gösterilir. */
  willRefund = true,
  pending = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: { reasonCode: OrderCancellationReason; reason?: string }) => void;
  willRefund?: boolean;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<OrderCancellationReason>(
    DEFAULT_CANCELLATION_REASON,
  );
  const [note, setNote] = useState('');

  const options = BUYER_SELECTABLE_CANCELLATION_REASONS.map((value) => {
    const key = reasonLabelKey(value);
    // Anahtarı olmayan bir kod ham hâliyle gösterilir — listeden sessizce
    // düşmez, yoksa sunucu enum'a değer eklediğinde seçenek görünmez olur.
    return { value, label: key ? t(key) : value };
  });

  const submit = () => {
    const trimmed = note.trim();
    // Modal ÖNCE kapanır (iOS donma kuralı), sonra mutasyon.
    onClose();
    onConfirm({ reasonCode, reason: trimmed ? trimmed : undefined });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('order.cancelOrder')}>
      <Text variant="caption" tone="muted" style={styles.intro}>
        {willRefund ? t('order.cancelConfirmRefundBody') : t('order.cancelConfirmBody')}
      </Text>

      <Select
        label={t('order.cancelReasonLabel')}
        value={reasonCode}
        onChange={(value) => setReasonCode(value as OrderCancellationReason)}
        options={options}
      />

      <View style={styles.noteWrap}>
        <Textarea
          value={note}
          onChangeText={setNote}
          placeholder={t('order.cancelReasonPlaceholder')}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
        />
      </View>

      <View style={styles.actions}>
        <Button
          variant="outline"
          title={t('order.cancelConfirmNo')}
          onPress={onClose}
          disabled={pending}
          style={styles.action}
        />
        <Button
          testID="cancel-order-confirm"
          variant="danger"
          title={t('order.cancelConfirmYes')}
          onPress={submit}
          isLoading={pending}
          disabled={pending}
          style={styles.action}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: theme.spacing[3] },
  noteWrap: { marginTop: theme.spacing[3] },
  actions: { flexDirection: 'row', gap: theme.spacing[2], marginTop: theme.spacing[4] },
  action: { flex: 1 },
});
