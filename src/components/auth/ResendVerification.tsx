import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { useResendVerification } from '@/hooks/useResendVerification';
import { usePendingAuthEmailStore } from '@/stores/pendingAuthEmailStore';

interface ResendVerificationProps {
  /** Güvenilir e-posta (oturum / kayıt anında saklanan). Misafirde alanın başlangıç değeri. */
  email: string | null;
  /** Yalnız misafir alanını ÖN DOLDURMAK için (ör. `?email=` bağlantı paramı); metinde gösterilmez. */
  prefill?: string | null;
  /** `true` (misafir): e-posta alanı gösterilir ve düzenlenebilir; `false`: yalnız düğme, `email` sabit. */
  askEmail: boolean;
  /** Düğme görünümü — hata durumunda birincil, boş durumda ikincil. */
  variant: 'primary' | 'outline';
  /** Düğme etiketi; varsayılan "Yeni Bağlantı Gönder". */
  label?: string;
  testID?: string;
}

/**
 * "Yeni doğrulama bağlantısı gönder" — `POST /auth/resend-verification` (oturumsuz, yalnız
 * e-posta). Girişsiz kullanıcı (doğrulama bağlantısı e-posta uygulamasından geldi) için
 * e-posta alanı çıkar; oturumlu kullanıcıda e-posta sabittir. Bekleme süresi ve toast'lar
 * kayıt ekranıyla ortak `useResendVerification` hook'unda (tek kaynak).
 */
export function ResendVerification({
  email,
  prefill,
  askEmail,
  variant,
  label,
  testID = 'resend-verification',
}: ResendVerificationProps) {
  const { t } = useTranslation();
  const schema = useMemo(
    () => z.object({ email: z.string().trim().email(t('auth.emailInvalidShort')) }),
    [t],
  );
  const initial = email ?? prefill ?? '';
  const form = useZodForm(schema, { defaultValues: { email: initial } });
  const { setValue, getValues, watch } = form;

  // E-posta sonradan gelirse (store / param) ve kullanıcı henüz bir şey yazmadıysa doldur.
  useEffect(() => {
    if (initial && !getValues('email')) setValue('email', initial);
  }, [initial, getValues, setValue]);

  const typed = watch('email')?.trim() ?? '';
  const target = askEmail ? typed : (email ?? '');
  const resend = useResendVerification(target || null, {
    neutral: askEmail,
    // Misafirin yazdığı adres, doğrulama bitince girişe taşınsın (bellek içi, kalıcı değil).
    onSent: askEmail ? (to) => usePendingAuthEmailStore.getState().setEmail(to) : undefined,
  });
  const waiting = resend.cooldown > 0;

  const submit = form.handleSubmit(() => resend.resend());

  return (
    <Form form={form}>
      {askEmail ? (
        <FormInput
          name="email"
          testID={`${testID}-email-input`}
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
      ) : null}
      <Button
        testID={`${testID}-button`}
        variant={variant}
        size="lg"
        fullWidth
        title={
          waiting
            ? t('checkout.resendCodeWithTimer', { seconds: resend.cooldown })
            : (label ?? t('auth.verifyRequestNewLink'))
        }
        onPress={askEmail ? submit : resend.resend}
        isLoading={resend.isPending}
        disabled={waiting || resend.isPending || !target}
      />
    </Form>
  );
}
