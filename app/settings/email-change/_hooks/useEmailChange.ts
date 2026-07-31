import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { emailChangeSchema, emailCodeSchema } from '../_lib/schema';

/** Sunucu hata mesajı string veya string[] gelebilir (NestJS doğrulama dizisi). */
const errorText = (e: unknown, fallback: string): string => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join('\n') : (m ?? fallback);
};

export function useEmailChange() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const { updateUser } = useAuthStore();

  const emailForm = useZodForm(emailChangeSchema, { defaultValues: { newEmail: '' } });
  const codeForm = useZodForm(emailCodeSchema, { defaultValues: { code: '' } });

  const request = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
    onSuccess: (_res, newEmail) => {
      setPendingEmail(newEmail);
      setStep('code');
      appAlert('Kod gönderildi', `Doğrulama kodu ${newEmail} adresine gönderildi.`);
    },
    onError: (e) => appAlert('Gönderilemedi', errorText(e, 'Kod gönderilemedi. Tekrar deneyin.')),
  });

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: (res) => {
      const email = (res.data as { email?: string })?.email;
      if (email) updateUser({ email });
      appAlert('E-posta güncellendi', 'Yeni e-posta adresiniz doğrulandı.');
      router.back();
    },
    onError: (e) => appAlert('Doğrulanamadı', errorText(e, 'Kod doğrulanamadı. Tekrar deneyin.')),
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
