import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Input, Text } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { errorText } from '@/lib/api';
import {
  legalIdentityGateSchema,
  legalIdentitySubmission,
  type LegalIdentityFormValues,
} from '@/lib/legalIdentity';
import {
  TCKN_LENGTH,
  normalizeTckn,
  type LegalIdentityField,
  type LegalIdentityStatus,
} from '@/lib/shared/legalIdentity';
import { useSubmitLegalIdentity } from '@/hooks/useLegalIdentity';
import { RequiredStepShell } from './RequiredStepShell';

/**
 * Kimlik adımı (web `LegalIdentityGate`) — İHTİYAÇ ANINDA açılır: üye kimlik
 * gerektiren bir işleme (ödeme, ilan verme, takas, banka hesabı) başladığında
 * yasal adı, soyadı ya da TCKN'si eksikse (Apple 5.1.1: kayıtta istenmez).
 *
 * Yalnız EKSİK alanlar sorulur; dolu olanlar salt-okunur durur ve gönderilmez
 * (dolu alanı göndermek 409). TCKN, üyenin kendi banka hesabında geçerli bir
 * numara varsa onunla ön doldurulur; ad hiçbir kaynaktan tahmin edilmez.
 * Kapatma düğmesi yok; tek alternatif "Vazgeç" (işlem iptal). Neden
 * istendiği ve KVKK metninin bağlantısı ekranda.
 */
export function LegalIdentityGate({
  status,
  onCancel,
}: {
  status: LegalIdentityStatus;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const submit = useSubmitLegalIdentity();
  const { missing } = status;
  const asks = (field: LegalIdentityField) => missing.includes(field);

  const schema = useMemo(
    () =>
      legalIdentityGateSchema(missing, {
        nameInvalid: t('identity.validation.nameInvalid'),
        nationalIdInvalid: t('identity.validation.nationalIdInvalid'),
      }),
    [missing, t],
  );
  const form = useZodForm(schema, {
    defaultValues: {
      legalFirstName: '',
      legalLastName: '',
      nationalId: status.suggestedNationalId ?? '',
    },
  });

  const onSubmit = (values: LegalIdentityFormValues) =>
    submit.mutate(legalIdentitySubmission(values, missing));

  return (
    <RequiredStepShell
      testID="identity-gate"
      icon="id-card-outline"
      title={t('identity.gate.title')}
      intro={t('identity.gate.intro')}
      error={submit.isError ? errorText(submit.error, t('identity.gate.submitFailed')) : null}
      primary={{
        label: t('identity.gate.submit'),
        onPress: form.handleSubmit(onSubmit),
        isLoading: submit.isPending,
        testID: 'identity-gate-submit',
      }}
      secondary={{
        label: t('common.cancel'),
        onPress: onCancel,
        disabled: submit.isPending,
        testID: 'identity-gate-cancel',
      }}
    >
      <Text variant="bodySm" tone="muted">
        {t('identity.gate.whenNeeded')}
      </Text>
      <Form form={form}>
        {asks('legalFirstName') ? (
          <FormInput
            name="legalFirstName"
            testID="identity-gate-legalFirstName"
            label={t('identity.legalFirstName')}
            helperText={t('identity.legalNameHint')}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
          />
        ) : (
          <Input
            label={t('identity.legalFirstName')}
            value={status.legalFirstName ?? ''}
            editable={false}
          />
        )}
        {asks('legalLastName') ? (
          <FormInput
            name="legalLastName"
            testID="identity-gate-legalLastName"
            label={t('identity.legalLastName')}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
          />
        ) : (
          <Input
            label={t('identity.legalLastName')}
            value={status.legalLastName ?? ''}
            editable={false}
          />
        )}
        {asks('nationalId') ? (
          <FormInput
            name="nationalId"
            testID="identity-gate-nationalId"
            label={t('identity.nationalId')}
            placeholder={t('identity.nationalIdPlaceholder')}
            helperText={status.suggestedNationalId ? t('identity.gate.prefilledHint') : undefined}
            keyboardType="number-pad"
            autoComplete="off"
            maxLength={TCKN_LENGTH}
            transform={(text) => normalizeTckn(text).slice(0, TCKN_LENGTH)}
          />
        ) : (
          <Input
            label={t('identity.nationalId')}
            value={status.nationalIdMasked ?? ''}
            editable={false}
          />
        )}
      </Form>
      <Text variant="caption" tone="muted">
        {t('identity.gate.lockedNote')}
      </Text>
      <Text
        variant="bodySm"
        tone="primary"
        weight="semibold"
        style={styles.link}
        onPress={() => router.push('/privacy')}
        accessibilityRole="link"
        testID="identity-gate-privacy"
      >
        {t('identity.gate.privacyLink')}
      </Text>
    </RequiredStepShell>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
});
