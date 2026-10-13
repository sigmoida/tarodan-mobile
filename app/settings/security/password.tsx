import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, SectionCard } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useDoChangePassword } from './_hooks/useDoChangePassword';
import { changePasswordSchema, type ChangePasswordValues } from './_lib/schema';
import { styles } from './_lib/styles';

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Şifre değiştir (web profil SecuritySection formu): mevcut / yeni (+ canlı gereksinim paneli) /
 * tekrar. Alan hataları satır içi (zod), işlem hatası toast; başarı: geri + toast.
 */
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const form = useZodForm(useMemo(() => changePasswordSchema(t), [t]), { defaultValues: EMPTY });
  const changePassword = useDoChangePassword();
  const newPassword = form.watch('newPassword') ?? '';
  if (!isAuthenticated) return null;

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword: next }) =>
    changePassword.mutate({ currentPassword, newPassword: next }, { onSuccess: goBackOrHome }),
  );

  return (
    <PageShell
      title={t('profile.security.changePassword')}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('profile.security.changePassword')}
          onPress={onSubmit}
          isLoading={changePassword.isPending}
          disabled={changePassword.isPending}
          testID="change-password-submit"
        />
      }
    >
      <SectionCard bodyStyle={styles.stack}>
        <Form form={form}>
          <FormInput
            name="currentPassword"
            label={t('profile.security.currentPassword')}
            secureTextEntry
            togglePasswordVisibility
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            testID="current-password-input"
          />
          <FormInput
            name="newPassword"
            label={t('auth.newPassword')}
            secureTextEntry
            togglePasswordVisibility
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            testID="new-password-input"
          />
          <PasswordChecklist password={newPassword} />
          <FormInput
            name="confirmPassword"
            label={t('profile.security.newPasswordRepeat')}
            secureTextEntry
            togglePasswordVisibility
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            testID="confirm-password-input"
          />
        </Form>
      </SectionCard>
    </PageShell>
  );
}
