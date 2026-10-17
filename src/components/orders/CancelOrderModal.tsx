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
 * ⚠️ src/ui/CLAUDE.md › iOS modal rule: mutasyonun `appAlert`'i modal AÇIKKEN patlarsa iOS donuyor.
 * Bu yüzden `onConfirm` çağrılmadan ÖNCE `onClose()` çalışır — sonuç geri
 * bildirimi çağıranın snackbar'ına düşer.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Label, RadioIndicator, Textarea, Button, Text, theme, ButtonRow } from '@/ui';
import {
  BUYER_SELECTABLE_CANCELLATION_REASONS,
  DEFAULT_CANCELLATION_REASON,
  reasonLabelKey,
  type OrderCancellationReason,
} from '@/lib/shared/orderCancellation';

/** Neden listesi + not alanı bölümü, pencere yüksekliğinin bu oranını aşarsa kayar. */
const BODY_MAX_HEIGHT_RATIO = 0.55;

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
  const { height: windowHeight } = useWindowDimensions();

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

      {/* Nedenler satır içi radyo listesi (modal içinde ikinci bir native sunum açılmaz);
          küçük ekranda/klavyede kaydırılır, düğmeler altta sabit kalır. */}
      <ScrollView
        style={{ maxHeight: windowHeight * BODY_MAX_HEIGHT_RATIO }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Label>{t('order.cancelReasonLabel')}</Label>
        <View accessibilityRole="radiogroup" style={styles.reasons}>
          {options.map((opt) => {
            const selected = opt.value === reasonCode;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setReasonCode(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={styles.reasonRow}
                testID={`cancel-reason-${opt.value}`}
              >
                <RadioIndicator checked={selected} />
                <Text variant="body" weight={selected ? 'semibold' : 'regular'} style={styles.reasonLabel}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteWrap}>
          <Textarea
            value={note}
            onChangeText={setNote}
            placeholder={t('order.cancelReasonPlaceholder')}
            maxLength={NOTE_MAX_LENGTH}
            rows={3}
          />
        </View>
      </ScrollView>

      <ButtonRow style={{ marginTop: theme.spacing[4] }}>
        <Button
          variant="outline"
          title={t('order.cancelConfirmNo')}
          onPress={onClose}
          disabled={pending}
        />
        <Button
          testID="cancel-order-confirm"
          variant="danger"
          title={t('order.cancelConfirmYes')}
          onPress={submit}
          isLoading={pending}
          disabled={pending}
        />
      </ButtonRow>
    </Modal>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: theme.spacing[3] },
  noteWrap: { marginTop: theme.spacing[3] },
  reasons: { marginBottom: theme.spacing[1] },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.minTouchTarget,
  },
  reasonLabel: { flex: 1, minWidth: 0 },
});
