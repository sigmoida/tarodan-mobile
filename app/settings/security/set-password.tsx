import { useTranslation } from 'react-i18next';
import { Button, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { ReauthModal } from '@/components/auth/ReauthModal';
import { passwordHint } from '@/utils/passwordPolicy';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useSetPasswordFlow } from './_hooks/useSetPasswordFlow';
import { styles } from './_lib/styles';

/**
 * Set a password (web `SecuritySection` set mode) for an account without one: new password
 * (missing rules under it while typing) and repeat. Submitting opens the confirm step first.
 */
export default function SetPasswordScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const f = useSetPasswordFlow();
  if (!isAuthenticated) return null;

  return (
    <PageShell
      title={t('profile.security.setPasswordTitle')}
      overlay={<ReauthModal {...f.reauthModal} />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('profile.security.setPasswordAction')}
          onPress={f.submit}
          isLoading={f.busy}
          disabled={f.busy}
          testID="set-password-submit"
        />
      }
    >
      <SectionCard bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">
          {t('profile.security.setPasswordIntro')}
        </Text>
        <Form form={f.form}>
          <FormInput
            name="newPassword"
            label={t('auth.newPassword')}
            secureTextEntry
            togglePasswordVisibility
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            helperText={passwordHint(f.newPassword, t)}
            testID="set-password-new-input"
          />
          <FormInput
            name="confirmPassword"
            label={t('profile.security.newPasswordRepeat')}
            secureTextEntry
            togglePasswordVisibility
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            testID="set-password-confirm-input"
          />
        </Form>
      </SectionCard>
    </PageShell>
  );
}
