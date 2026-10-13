import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userReportsApi, errorText } from '@/lib/api';
import { theme, Text, Button, Modal, Textarea, Icon, ButtonRow, RadioIndicator, toast } from '@/ui';

const { colors } = theme;

export type ReportTargetType = 'product' | 'user' | 'collection' | 'message';

/** Web `ReportModal` ile aynı TEK neden listesi (ürün, kullanıcı, koleksiyon, mesaj hepsi için). */
export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_product'
  | 'scam'
  | 'other';

interface ReportModalProps {
  visible: boolean;
  onDismiss: () => void;
  type: ReportTargetType;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

/**
 * Şikayet nedenleri — sıra ve anahtarlar web `ReportModal` ile birebir (`report.reason*`).
 * Ürün, kullanıcı, koleksiyon ve mesaj şikayeti TEK listeyi paylaşır; ayrı liste tutulmaz.
 */
const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; labelKey: ReasonLabelKey }> = [
  { value: 'spam', labelKey: 'report.reasonSpam' },
  { value: 'inappropriate_content', labelKey: 'report.reasonInappropriate' },
  { value: 'harassment', labelKey: 'report.reasonHarassment' },
  { value: 'fake_product', labelKey: 'report.reasonFakeProduct' },
  { value: 'scam', labelKey: 'report.reasonScam' },
  { value: 'other', labelKey: 'report.reasonOther' },
];

type ReasonLabelKey =
  | 'report.reasonSpam'
  | 'report.reasonInappropriate'
  | 'report.reasonHarassment'
  | 'report.reasonFakeProduct'
  | 'report.reasonScam'
  | 'report.reasonOther';

/** Sunucu açıklamayı en az bu uzunlukta kabul eder (web ile aynı); kısaysa hiç gönderilmez. */
const MIN_DESCRIPTION_LENGTH = 10;

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
    mutationFn: (payload: { reason: ReportReason; description?: string }) =>
      userReportsApi.create({ type, targetId, ...payload }),
    onSuccess: () => {
      toast.success(t('report.submitSuccess'));
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(errorText(error, t('report.submitFailed')));
    },
  });

  const handleClose = () => {
    setReason('');
    setDescription('');
    onDismiss();
  };

  // §12/§14: modal mutation'ı BEKLEMEZ — önce kapat, sonra gönder; sonuç toast (modal artık kapalı,
  // toast görünür).
  const handleSubmit = () => {
    if (!reason) return;
    const trimmed = description.trim();
    const payload = {
      reason,
      description: trimmed.length >= MIN_DESCRIPTION_LENGTH ? trimmed : undefined,
    };
    handleClose();
    reportMutation.mutate(payload);
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} title={title}>
      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
        <Text variant="label" align="center" numberOfLines={2} style={styles.targetInfo}>
          {targetName}
        </Text>

        <Text variant="label" style={styles.sectionTitle}>
          {t('report.reasonSectionTitle')}
        </Text>

        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r.value}
            testID={`report-reason-${r.value}`}
            style={[styles.reasonItem, reason === r.value && styles.reasonItemSelected]}
            onPress={() => setReason(r.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.value }}
          >
            <RadioIndicator checked={reason === r.value} />
            <Text style={styles.reasonText}>{t(r.labelKey)}</Text>
          </Pressable>
        ))}

        <Text variant="label" style={styles.sectionTitle}>
          {t('report.detailsLabel')}
        </Text>
        <Textarea
          testID="report-description-input"
          value={description}
          onChangeText={setDescription}
          rows={3}
          placeholder={t('report.detailsPlaceholder')}
          maxLength={500}
          style={styles.input}
        />
        <Text variant="caption" align="right" style={styles.charCount}>
          {description.length}/500
        </Text>

        <View style={styles.warningBox}>
          <Icon name="exclamation-triangle" variant="solid" size={theme.iconSize.md} color={colors.warning[600]!} />
          <Text variant="caption" tone="warning" style={styles.warningText}>
            {t('report.falseReportWarning')}
          </Text>
        </View>
      </ScrollView>

      <ButtonRow style={styles.buttons}>
        <Button variant="ghost" title={t('common.cancel')} onPress={handleClose} testID="report-cancel-button" />
        <Button
          variant="danger"
          title={t('report.report')}
          onPress={handleSubmit}
          disabled={!reason}
          testID="report-submit-button"
        />
      </ButtonRow>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 480,
  },
  targetInfo: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
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
  },
  input: {
    backgroundColor: colors.surface.DEFAULT,
  },
  charCount: {
    marginTop: theme.spacing[1],
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
  },
  buttons: {
    marginTop: theme.spacing[3],
  },
});
