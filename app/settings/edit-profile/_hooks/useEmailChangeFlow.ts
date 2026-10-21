import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi, errorText } from '@/lib/api';
import { isServerOrNetworkFailure, isSessionEndedError } from '@/lib/api/reauthError';
import { useReauth } from '@/hooks/useReauth';
import { captureException } from '@/services/sentry';
import { useAuthStore } from '@/stores/authStore';
import { buildEmailChangeSchema, buildEmailCodeSchema } from '../_lib/schema';
import { EMAIL_CODE_RESEND_SECONDS, type EmailPhase } from '../_lib/emailChange';
import { useRefreshAccount } from './useRefreshAccount';

/**
 * State machine of the e-mail change screen (`edit-profile/email`), no modal of its own:
 *   entering -> codeSent -> (success) `onVerified` (the screen goes back)
 * The server has no "pending change" query; the code lives 15 min and `verify` asks only for
 * the code, so `codeSent` is kept in memory for the screen's lifetime. The current e-mail stays
 * valid until the code is verified. Every error shows under its field (no dialog jumping over the
 * keyboard). Leaving the screen cancels.
 *
 * Step-up: each code request (first and resend) runs the confirm step first and sends its token
 * as `reauthToken` (`useReauth().runGated`, reused until shortly before it expires). A device that
 * cannot confirm sends no token, which the API accepts while
 * `auth_require_reauth_for_sensitive_actions` is off.
 */
export function useEmailChangeFlow({ onVerified }: { onVerified?: () => void } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const refreshAccount = useRefreshAccount();

  const [phase, setPhase] = useState<EmailPhase>('entering');
  const [pendingEmail, setPendingEmail] = useState('');
  // Yeniden gönderme sınırı (ms). Saniyelik geri sayım yaprakta (`EmailResendButton` →
  // `useSecondsUntil`): her tik bu akış hook'unu ve formu yeniden çizmesin.
  const [resendAt, setResendAt] = useState(0);

  const emailSchema = useMemo(() => buildEmailChangeSchema(t), [t]);
  const codeSchema = useMemo(() => buildEmailCodeSchema(t), [t]);
  const emailForm = useZodForm(emailSchema, { defaultValues: { newEmail: '' } });
  const codeForm = useZodForm(codeSchema, { defaultValues: { code: '' } });

  const reauth = useReauth('email_change');
  const request = useMutation({
    mutationFn: ({ newEmail, reauthToken }: { newEmail: string; reauthToken?: string }) =>
      authApi.requestEmailChange(newEmail, reauthToken),
    // The variables hold the step-up token: no cache entry after use.
    gcTime: 0,
  });
  const requestLock = useRef(false);

  /** Confirm step, then the code request; the outcome and every error land here once. */
  const sendCode = async (newEmail: string) => {
    if (requestLock.current) return;
    requestLock.current = true;
    // A resend from the code step shows its error under the code field; the first request
    // (or a corrected address) under the e-mail field. Read now, before any await.
    const isResend = newEmail === pendingEmail && phase === 'codeSent';
    try {
      const outcome = await reauth.runGated((reauthToken) => request.mutateAsync({ newEmail, reauthToken }));
      if (outcome.status !== 'done') return;
      setPendingEmail(newEmail);
      codeForm.reset({ code: '' });
      setPhase('codeSent');
      // From the local clock; the server applies a 60 s cooldown.
      setResendAt(Date.now() + EMAIL_CODE_RESEND_SECONDS * 1000);
      toast.success(t('profile.emailChangeCodeSent'));
    } catch (e) {
      if (isSessionEndedError(e)) return;
      if (isServerOrNetworkFailure(e)) {
        captureException(e, { level: 'error', tags: { flow: 'email_change' } });
      }
      const message = errorText(e, t('checkout.guestEmailSendCodeFailed'));
      if (isResend) codeForm.setError('code', { type: 'server', message });
      else emailForm.setError('newEmail', { type: 'server', message });
    } finally {
      requestLock.current = false;
    }
  };

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: async (res) => {
      const email = (res.data as { email?: string })?.email ?? pendingEmail;
      // Sunucu doğrulamada `isEmailVerified: true` yazar; tazeleme düşse bile
      // store bayat kalmasın.
      updateUser({ email, isEmailVerified: true });
      await refreshAccount();
      toast.success(t('profile.emailChanged'));
      onVerified?.();
    },
    onError: (e) =>
      codeForm.setError('code', {
        type: 'server',
        message: errorText(e, t('settings.codeVerifyFailedBody')),
      }),
  });

  return {
    email: user?.email ?? '',
    isEmailVerified: !!user?.isEmailVerified,
    phase,
    pendingEmail,
    /** Yeniden gönderilebileceği an (ms); kalan saniye yaprakta `useSecondsUntil`. */
    resendAt,
    emailForm,
    codeForm,
    /** Kod adımından yeni adresi düzeltmek için geri dön (yazılan değer korunur). */
    fixEmail: () => {
      codeForm.reset({ code: '' });
      setPhase('entering');
    },
    submitEmail: emailForm.handleSubmit((v) => sendCode(v.newEmail.trim())),
    submitCode: codeForm.handleSubmit((v) => verify.mutate(v.code.trim())),
    resend: () => {
      if (Date.now() < resendAt || request.isPending || reauth.pending || !pendingEmail) return;
      void sendCode(pendingEmail);
    },
    isRequesting: request.isPending || reauth.pending,
    isVerifying: verify.isPending,
    reauthModal: reauth.modal,
  };
}

export type EmailChangeFlow = ReturnType<typeof useEmailChangeFlow>;
