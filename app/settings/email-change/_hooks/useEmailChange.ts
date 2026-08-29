import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi, errorText } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { buildEmailChangeSchema, buildEmailCodeSchema } from '../_lib/schema';

export function useEmailChange() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const { updateUser } = useAuthStore();

  const emailChangeSchema = useMemo(() => buildEmailChangeSchema(t), [t]);
  const emailCodeSchema = useMemo(() => buildEmailCodeSchema(t), [t]);

  const emailForm = useZodForm(emailChangeSchema, { defaultValues: { newEmail: '' } });
  const codeForm = useZodForm(emailCodeSchema, { defaultValues: { code: '' } });

  const request = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
    onSuccess: (_res, newEmail) => {
      setPendingEmail(newEmail);
      setStep('code');
      appAlert(t('profile.codeSent'), t('checkout.otpSentToEmail', { email: newEmail }));
    },
    onError: (e) =>
      appAlert(t('auth.failedToSend'), errorText(e, t('checkout.guestEmailSendCodeFailed'))),
  });

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: (res) => {
      const email = (res.data as { email?: string })?.email;
      if (email) updateUser({ email });
      appAlert(t('settings.emailUpdatedTitle'), t('settings.emailUpdatedBody'));
      router.back();
    },
    onError: (e) =>
      appAlert(t('settings.verifyFailedTitle'), errorText(e, t('settings.codeVerifyFailedBody'))),
  });

  return {
    step,
    pendingEmail,
    emailForm,
    codeForm,
    submitEmail: emailForm.handleSubmit((v) => request.mutate(v.newEmail.trim())),
    submitCode: codeForm.handleSubmit((v) => verify.mutate(v.code.trim())),
    isRequesting: request.isPending,
    isVerifying: verify.isPending,
  };
}
