import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { userReportsApi } from '@/lib/api';
import { theme, Text, Button, Modal, Textarea } from '@/ui';

const { colors } = theme;

export type ReportTargetType = 'product' | 'user' | 'collection' | 'message';

export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'fake_product'
  | 'scam'
  | 'harassment'
  | 'hate_speech'
  | 'counterfeit'
  | 'wrong_category'
  | 'misleading_info'
  | 'other';

interface ReportModalProps {
  visible: boolean;
  onDismiss: () => void;
  type: ReportTargetType;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

// Tek kaynaktan neden etiketleri — modül düzeyinde sabitlenirse i18next hazır
// olmadan çözülür ve donar; bileşen `useMemo(() => buildReasonLabels(t), [t])`
// ile çağırır. Katalogdaki `report.reason*` anahtarları kanonik: aynı neden
// birden fazla listede farklı ifadeyle tekrar etmesin diye TEK etiket/neden.
const buildReasonLabels = (t: TFunction): Record<ReportReason, string> => ({
  spam: t('report.reasonSpam'),
  inappropriate_content: t('report.reasonInappropriate'),
  fake_product: t('report.reasonFakeProduct'),
  scam: t('report.reasonScam'),
  harassment: t('report.reasonHarassment'),
  hate_speech: t('report.reasonHateSpeech'),
  counterfeit: t('report.reasonCounterfeit'),
  wrong_category: t('report.reasonWrongCategory'),
  misleading_info: t('report.reasonMisleadingInfo'),
  other: t('report.reasonOther'),
});

const PRODUCT_REASON_VALUES: ReportReason[] = [
  'counterfeit',
  'fake_product',
  'misleading_info',
  'wrong_category',
  'inappropriate_content',
  'spam',
  'other',
];

const USER_REASON_VALUES: ReportReason[] = [
  'scam',
  'harassment',
  'hate_speech',
  'spam',
  'inappropriate_content',
  'other',
];

const GENERIC_REASON_VALUES: ReportReason[] = [
  'inappropriate_content',
  'spam',
  'misleading_info',
  'other',
];

export default function ReportModal({
  visible,
  onDismiss,
  type,
  targetId,
  targetName,
  onSuccess,
}: ReportModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');

  const reasonLabels = useMemo(() => buildReasonLabels(t), [t]);

  const reasons = useMemo(() => {
    const values =
      type === 'product' ? PRODUCT_REASON_VALUES
      : type === 'user' ? USER_REASON_VALUES
      : GENERIC_REASON_VALUES;
    return values.map((value) => ({ value, label: reasonLabels[value] }));
  }, [type, reasonLabels]);

  const title = useMemo(() => {
    switch (type) {
      case 'product': return t('report.reportListing');
      case 'user': return t('report.reportUser');
      case 'collection': return t('report.reportCollection');
      case 'message': return t('report.reportMessage');
      default: return t('report.report');
    }
  }, [type, t]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error('missing_reason');
      return userReportsApi.create({
        type,
        targetId,
        reason: reason as ReportReason,
        description: description || undefined,
      });
    },
  });

  // #82: unmount sonrası setState uyarısını önle — kapatma timer'ını sakla + temizle.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const handleClose = () => {
    setReason('');
    setDescription('');
    reportMutation.reset();
    onDismiss();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      await reportMutation.mutateAsync();
      onSuccess?.();
      // Kullanıcıya başarı mesajını göster, ardından kapat
      closeTimer.current = setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (e) {
      // error state is tracked by mutation
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} title={title}>
      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
        <Text style={styles.targetInfo} numberOfLines={2}>{targetName}</Text>

        <Text style={styles.sectionTitle}>{t('report.reasonSectionTitle')}</Text>

        {reasons.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.reasonItem,
              reason === r.value && styles.reasonItemSelected,
            ]}
            onPress={() => setReason(r.value)}
          >
            <Ionicons
              name={reason === r.value ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={reason === r.value ? colors.primary[600]! : colors.text.muted}
            />
            <Text style={styles.reasonText}>{r.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>{t('report.descriptionLabel')}</Text>
        <Textarea
          value={description}
          onChangeText={setDescription}
          rows={3}
          placeholder={t('report.detailsPlaceholder')}
          maxLength={500}
          style={styles.input}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color={colors.warning[600]!} />
          <Text style={styles.warningText}>
            {t('report.falseReportWarning')}
          </Text>
        </View>

        {reportMutation.error ? (
          <Text style={styles.errorText}>
            {t('report.submitFailed')}
          </Text>
        ) : null}

        {reportMutation.isSuccess ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
            <Text style={styles.successText}>
              {t('report.submitSuccess')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant="ghost"
          title={t('common.cancel')}
          onPress={handleClose}
          disabled={reportMutation.isPending}
        />
        <Button
          variant="danger"
          title={t('report.report')}
          onPress={handleSubmit}
          isLoading={reportMutation.isPending}
          disabled={!reason || reportMutation.isPending}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 480,
  },
  targetInfo: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: theme.spacing[4],
    color: colors.text.heading,
  },
  sectionTitle: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
    color: colors.text.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  reasonItemSelected: {
    backgroundColor: colors.primary[50]!,
  },
  reasonText: {
    marginLeft: theme.spacing[3],
    color: colors.text.heading,
  },
  input: {
    backgroundColor: colors.surface.DEFAULT,
  },
  charCount: {
    textAlign: 'right',
    marginTop: theme.spacing[1],
    fontSize: 12,
    color: colors.text.muted,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[50]!,
    padding: theme.spacing[3],
    marginTop: theme.spacing[4],
    borderRadius: theme.radius.xl,
    gap: theme.spacing[2],
  },
  warningText: {
    flex: 1,
    color: colors.warning[600]!,
    fontSize: 12,
  },
  errorText: {
    textAlign: 'center',
    color: colors.danger[600]!,
    marginTop: theme.spacing[4],
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50]!,
    padding: theme.spacing[3],
    marginTop: theme.spacing[4],
    borderRadius: theme.radius.xl,
    gap: theme.spacing[2],
  },
  successText: {
    flex: 1,
    color: colors.success[600]!,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
});
