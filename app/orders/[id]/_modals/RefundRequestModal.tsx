import { useTranslation } from 'react-i18next';
import React, { useMemo } from 'react';
import { View, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { Modal, Button, RadioGroup, Text, theme } from '@/ui';
import { useZodForm, Form, FormInput } from '@/ui/form';
import { Ionicons } from '@expo/vector-icons';
import { useRefundReasons, MAX_EVIDENCE_PHOTOS } from '../_lib/status';
import { refundFormDefaults, refundRequestSchema, refundRequirements } from '../_lib/schema';
import { pickEvidencePhotos } from '../_lib/pickEvidence';
import { useDoRefundRequest } from '../_hooks/useDoRefundRequest';
import { useUploadRefundEvidence } from '../_hooks/useUploadRefundEvidence';
import type { Notify } from '../_lib/types';
import type { TimingMessageValues } from '@/lib/shared/timingPolicy';

const { colors, radius } = theme;

/**
 * İade talebi modalı — kendi `useZodForm` + şema + mutasyonunun sahibi (CLAUDE.md
 * §6/§7, kalıp: `app/offers/_modals/CounterOfferModal.tsx`). Ekran yalnız
 * aç/kapa durumunu tutar. Zorunluluklar `_lib/schema.ts`'ten gelir; etiketler
 * koşula göre "*" ya da "(isteğe bağlı)" der (web ile aynı).
 */
export function RefundRequestModal({
  visible,
  onClose,
  orderId,
  orderQuantity,
  notify,
  timingValues,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderQuantity: number;
  notify: Notify;
  /** Süre metinlerinin ICU parametreleri — ekranın `deriveOrderView(...).timing`'i. */
  timingValues: TimingMessageValues;
}) {
  const { t } = useTranslation();
  const refundReasons = useRefundReasons();
  const schema = useMemo(() => refundRequestSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: refundFormDefaults() });
  const upload = useUploadRefundEvidence(orderId);
  const create = useDoRefundRequest(orderId, notify);
  const busy = upload.isPending || create.isPending;

  const reason = form.watch('reason');
  const quantity = form.watch('quantity');
  const evidence = form.watch('evidence');
  const { errors, isSubmitted } = form.formState;
  const requirements = refundRequirements(reason);

  /** Kapatınca tüm alanlar (neden, açıklama, adet, kanıt) ve hatalar sıfırlanır. */
  const resetAndClose = () => {
    form.reset(refundFormDefaults());
    onClose();
  };
  // Kullanıcı kapatması: yükleme sürerken yok sayılır (bitince talep yine gönderilirdi).
  const close = () => {
    if (!upload.isPending) resetAndClose();
  };

  // Gönderimden sonra hatalar canlı: neden değişince açıklama/kanıt kuralı da değişir.
  const setReason = (v: string) => {
    form.setValue('reason', v, { shouldDirty: true });
    if (isSubmitted) void form.trigger();
  };
  const setQuantity = (fn: (q: number) => number) =>
    form.setValue('quantity', fn(form.getValues('quantity')), {
      shouldDirty: true,
    });
  const setEvidence = (next: typeof evidence) =>
    form.setValue('evidence', next, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });

  const pickEvidence = async () => {
    const current = form.getValues('evidence');
    const picked = await pickEvidencePhotos(MAX_EVIDENCE_PHOTOS - current.length);
    if (picked === 'denied') {
      form.setError('evidence', {
        type: 'permission',
        message: t('order.galleryPermissionBody'),
      });
      return;
    }
    if (picked.length > 0) setEvidence([...current, ...picked]);
  };
  const removeEvidence = (index: number) => setEvidence(form.getValues('evidence').filter((_, i) => i !== index));

  const onSubmit = form.handleSubmit(async (values) => {
    // Kanıt modal AÇIKKEN yüklenir: başarısız ya da URL'siz bir yükleme hatası
    // burada, alanın altında görünür ve talep GÖNDERİLMEZ (kanıtsız istek
    // sunucudan `evidenceRequired` 400'ü alırdı).
    let evidencePhotoUrls: string[] = [];
    if (values.evidence.length > 0) {
      try {
        evidencePhotoUrls = await upload.mutateAsync(values.evidence);
      } catch {
        form.setError('evidence', { type: 'upload', message: t('order.evidenceUploadFailed') });
        return;
      }
    }
    // Modalı ÖNCE kapat: mutasyonun geri bildirimi (snackbar/uyarı) bir ui-native
    // Modal açıkken çıkarsa iOS donar. Değerler `values`'ta, sıfırlama güvenli.
    resetAndClose();
    create.mutate({ values, orderQuantity, evidencePhotoUrls });
  });

  return (
    <Modal isOpen={visible} onClose={close} title={t('order.requestRefundTitle')}>
      <ScrollView>
        <Form form={form}>
          <Text variant="caption" style={styles.refundModalHint}>
            {requirements.evidenceRequired ? t('order.refundHintFaultClaim') : t('order.refundHintTop', timingValues)}
          </Text>

          {orderQuantity > 1 && (
            <View style={styles.qtySection}>
              <Text variant="caption" style={styles.refundModalLabel}>
                {t('order.refundQuantity')}
              </Text>
              <Text variant="caption" style={styles.evidenceHint}>
                {t('order.refundQuantityHint', { quantity: orderQuantity })}
              </Text>
              <View style={styles.qtyRow}>
                <Pressable
                  testID="refund-qty-dec"
                  accessibilityRole="button"
                  accessibilityLabel={t('order.qtyDecreaseA11y')}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={20} color={colors.text.heading} />
                </Pressable>
                <Text testID="refund-qty-value" variant="h3" style={styles.qtyValue}>
                  {quantity}
                </Text>
                <Pressable
                  testID="refund-qty-inc"
                  accessibilityRole="button"
                  accessibilityLabel={t('order.qtyIncreaseA11y')}
                  onPress={() => setQuantity((q) => Math.min(orderQuantity, q + 1))}
                  disabled={quantity >= orderQuantity}
                  style={[styles.qtyBtn, quantity >= orderQuantity && styles.qtyBtnDisabled]}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={20} color={colors.text.heading} />
                </Pressable>
              </View>
            </View>
          )}

          <Text variant="caption" style={styles.refundModalLabel}>
            {t('order.refundReasonOptional')}
          </Text>
          <RadioGroup value={reason} onChange={setReason} options={refundReasons} />
          {errors.reason?.message ? (
            <Text testID="refund-reason-error" variant="caption" style={styles.errorText}>
              {errors.reason.message}
            </Text>
          ) : null}

          <FormInput
            name="description"
            testID="refund-description-input"
            label={
              requirements.descriptionRequired
                ? t('order.descriptionRequiredLabel')
                : t('order.descriptionOptionalLabel')
            }
            placeholder={
              requirements.descriptionRequired
                ? t('order.describeIssuePlaceholder')
                : t('order.describeIssueOptionalPlaceholder')
            }
            multiline
            numberOfLines={4}
            containerStyle={{ marginTop: theme.spacing[3] }}
            inputStyle={{ minHeight: 80 }}
          />

          <View style={styles.evidenceSection}>
            <Text variant="caption" style={styles.refundModalLabel}>
              {requirements.evidenceRequired
                ? t('order.evidencePhotosRequiredLabel', { max: MAX_EVIDENCE_PHOTOS })
                : t('order.evidencePhotoOptional')}
            </Text>
            <Text
              testID="refund-evidence-hint"
              variant="caption"
              style={[styles.evidenceHint, errors.evidence ? styles.errorText : null]}
            >
              {errors.evidence?.message ??
                (requirements.evidenceRequired
                  ? t('order.photoEvidenceRequired')
                  : t('order.evidenceOptionalHint', {
                      max: MAX_EVIDENCE_PHOTOS,
                    }))}
            </Text>
            <View style={styles.evidenceGrid}>
              {evidence.map((a, i) => (
                <View key={`${a.uri}-${i}`} testID="refund-evidence-thumb" style={styles.evidenceThumbWrap}>
                  <Image source={{ uri: a.uri }} style={styles.evidenceThumb} />
                  <Pressable
                    style={styles.evidenceRemove}
                    onPress={() => removeEvidence(i)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('order.removePhotoA11y')}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {evidence.length < MAX_EVIDENCE_PHOTOS ? (
                <Pressable
                  style={styles.evidenceAdd}
                  onPress={pickEvidence}
                  accessibilityRole="button"
                  accessibilityLabel={t('order.addPhotoA11y')}
                >
                  <Ionicons name="camera-outline" size={22} color={colors.text.muted} />
                  <Text style={styles.evidenceAddText}>{t('common.add')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.refundModalActions}>
            <Button variant="ghost" title={t('trade.dispute.cancelCta')} onPress={close} disabled={upload.isPending} />
            <Button
              variant="primary"
              title={t('order.submitRefund')}
              onPress={onSubmit}
              isLoading={busy}
              disabled={busy}
            />
          </View>
        </Form>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  refundModalHint: { color: colors.text.muted, marginBottom: theme.spacing[3] },
  refundModalLabel: {
    color: colors.text.heading,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  refundModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[4],
  },
  qtySection: { marginTop: theme.spacing[1], marginBottom: theme.spacing[1] },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    marginTop: theme.spacing[2],
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.alt,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyValue: { minWidth: 32, textAlign: 'center', color: colors.text.heading },
  evidenceSection: { marginTop: theme.spacing[3] },
  evidenceHint: { color: colors.text.muted, marginBottom: theme.spacing[2] },
  errorText: { color: colors.danger[600]! },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  evidenceThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'visible',
  },
  evidenceThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
  },
  evidenceRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    backgroundColor: colors.danger[600]!,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  evidenceAdd: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.alt,
  },
  evidenceAddText: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: theme.spacing[0.5],
  },
});
