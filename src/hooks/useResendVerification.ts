import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';

/** Yeniden gönderme bekleme süresi (sn) — kayıt e-postası az önce gitti; art arda basışı keser. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Kayıt sonrası ve e-posta doğrulama ekranında "Doğrulama e-postasını tekrar gönder"
 * (web `useRegister.resendVerification`: `POST /auth/resend-verification`, oturumsuz, yalnız e-posta). Geri sayım kayıt anında başlar
 * (ilk e-posta zaten gönderildi) ve her başarılı gönderimde yeniden kurulur; toast'lar
 * `useAppMutation`'da.
 */
export function useResendVerification(email: string | null) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    // Her saniye bir tik: effect `cooldown` değişince yeniden kurulur (interval gerekmez).
    const id = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const startCooldown = useCallback(() => setCooldown(RESEND_COOLDOWN_SECONDS), []);

  const mutation = useAppMutation((to: string) => authApi.resendVerification(to), {
    success: t('auth.verificationEmailResent'),
    error: t('auth.couldNotResendEmail'),
    onSuccess: startCooldown,
  });

  const resend = () => {
    if (!email || cooldown > 0 || mutation.isPending) return;
    mutation.mutate(email);
  };

  return { resend, cooldown, isPending: mutation.isPending, startCooldown };
}
