import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi, errorText } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { buildEmailChangeSchema, buildEmailCodeSchema } from '../_lib/schema';
import { EMAIL_CODE_RESEND_SECONDS, type EmailPhase } from '../_lib/emailChange';
import { useRefreshAccount } from './useRefreshAccount';

/**
 * E-posta değişikliği ekranının (`edit-profile/email`) durum makinesi (modal YOK):
 *   entering → codeSent → (başarı) `onVerified` (ekran geri döner)
 * Sunucuda "bekleyen değişiklik" sorgusu yok; kod 15 dk geçerli ve `verify` yalnız
 * kodu ister, bu yüzden `codeSent` ekran ömrü boyunca bellekte tutulur. Mevcut
 * e-posta kod doğrulanana kadar geçerli kalır. Tüm hatalar ilgili alanın altında
 * gösterilir (klavye açıkken dialog sıçraması yok). Vazgeçmek = ekrandan çıkmak.
 */
export function useEmailChangeFlow({ onVerified }: { onVerified?: () => void } = {}) {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const refreshAccount = useRefreshAccount();

  const [phase, setPhase] = useState<EmailPhase>('entering');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const emailSchema = useMemo(() => buildEmailChangeSchema(t), [t]);
  const codeSchema = useMemo(() => buildEmailCodeSchema(t), [t]);
  const emailForm = useZodForm(emailSchema, { defaultValues: { newEmail: '' } });
  const codeForm = useZodForm(codeSchema, { defaultValues: { code: '' } });

  // Yeniden gönderme geri sayımı (yerel zamandan; sunucu 60 sn cooldown uyguluyor).
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const request = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
    onSuccess: (_res, newEmail) => {
      setPendingEmail(newEmail);
      codeForm.reset({ code: '' });
      setPhase('codeSent');
      setResendIn(EMAIL_CODE_RESEND_SECONDS);
      toast.success(t('profile.emailChangeCodeSent'));
    },
    onError: (e, newEmail) => {
      const message = errorText(e, t('checkout.guestEmailSendCodeFailed'));
      // Yeniden gönderme kod adımında → hata kod alanının altında; ilk istek
      // (veya düzeltilen adres) e-posta alanının altında.
      if (newEmail === pendingEmail && phase === 'codeSent') {
        codeForm.setError('code', { type: 'server', message });
      } else {
        emailForm.setError('newEmail', { type: 'server', message });
      }
    },
  });

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
    resendIn,
    emailForm,
    codeForm,
    /** Kod adımından yeni adresi düzeltmek için geri dön (yazılan değer korunur). */
    fixEmail: () => {
      codeForm.reset({ code: '' });
      setPhase('entering');
    },
    submitEmail: emailForm.handleSubmit((v) => request.mutate(v.newEmail.trim())),
    submitCode: codeForm.handleSubmit((v) => verify.mutate(v.code.trim())),
    resend: () => {
      if (resendIn > 0 || request.isPending || !pendingEmail) return;
      request.mutate(pendingEmail);
    },
    isRequesting: request.isPending,
    isVerifying: verify.isPending,
  };
}

export type EmailChangeFlow = ReturnType<typeof useEmailChangeFlow>;
