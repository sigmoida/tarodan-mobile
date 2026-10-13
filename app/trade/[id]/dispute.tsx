import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, RadioGroup, SectionCard, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { DISPUTE_REASONS, DISPUTE_REASON_LABEL_KEY } from './_lib/disputeReasons';
import { DISPUTE_DESCRIPTION_MAX } from './_lib/schema';
import { useDisputeForm } from './_hooks/useDisputeForm';

const { spacing } = theme;

/**
 * Takas itirazı — düz stack ekranı (takas detayındaki "İtiraz Aç" iter). Eskiden
 * modaldı; doğrulama hatası artık alanın altında, sonuç toast'ları hiçbir Modal'ın
 * altında kalmıyor. Form + mutasyon `useDisputeForm`'da; gönder alt çubukta.
 */
export default function TradeDisputeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispute = useDisputeForm(String(id));
  const options = DISPUTE_REASONS.map((value) => ({ value, label: t(DISPUTE_REASON_LABEL_KEY[value]) }));

  return (
    <Form form={dispute.form}>
      <PageShell
        title={t('trade.dispute.modalTitle')}
        testID="trade-dispute-screen"
        footer={
          <Button
            testID="trade-dispute-submit-button"
            variant="danger"
            size="lg"
            fullWidth
            title={t('trade.dispute.submitCta')}
            onPress={dispute.onSubmit}
            isLoading={dispute.isPending}
            disabled={dispute.isPending}
          />
        }
      >
        <SectionCard>
          <Text variant="bodySm" tone="muted" style={styles.intro}>
            {t('trade.dispute.modalIntro')}
          </Text>
          <Text variant="label" style={styles.label}>
            {t('common.reason')}
          </Text>
          <RadioGroup value={dispute.reason} onChange={dispute.setReason} options={options} />
          <FormInput
            name="description"
            testID="trade-dispute-description-input"
            label={t('trade.dispute.descriptionLabel')}
            placeholder={t('trade.dispute.descriptionPlaceholder')}
            multiline
            numberOfLines={4}
            maxLength={DISPUTE_DESCRIPTION_MAX}
            containerStyle={styles.description}
            inputStyle={{ minHeight: 100 }}
          />
        </SectionCard>
      </PageShell>
    </Form>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing[4] },
  label: { marginBottom: spacing[2] },
  description: { marginTop: spacing[4] },
});
