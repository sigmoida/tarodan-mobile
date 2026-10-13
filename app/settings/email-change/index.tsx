import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, SectionCard, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { useEmailChange } from './_hooks/useEmailChange';

export default function EmailChangeScreen() {
  const { t } = useTranslation();
  const f = useEmailChange();

  return (
    <PageShell title={t('settings.emailChangeLink')}>
      <Alert variant="info" title={t('settings.emailChangeActiveTitle')}>
        {t('settings.emailChangeActiveBody')}
      </Alert>

      <SectionCard bodyStyle={styles.form}>
        {f.step === 'email' ? (
          <Form form={f.emailForm}>
            <FormInput
              name="newEmail"
              label={t('settings.newEmailLabel')}
              placeholder={t('settings.newEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-change-input"
            />
            <Button
              title={t('settings.sendCodeButton')}
              onPress={f.submitEmail}
              isLoading={f.isRequesting}
              testID="email-change-request"
            />
          </Form>
        ) : (
          <Form form={f.codeForm}>
            <Text variant="bodySm" style={styles.hint}>
              {t('checkout.otpSentToEmail', { email: f.pendingEmail })}
            </Text>
            <FormInput
              name="code"
              label={t('security.verificationCode')}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              testID="email-change-code"
            />
            <Button
              title={t('security.verify')}
              onPress={f.submitCode}
              isLoading={f.isVerifying}
              testID="email-change-verify"
            />
          </Form>
        )}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[3] },
  hint: { color: theme.colors.text.muted },
});
