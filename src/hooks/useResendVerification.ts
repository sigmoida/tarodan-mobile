import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { toast } from '@/ui';
import { startResendCooldown, useResendCooldownStore, cooldownKey } from '@/stores/resendCooldownStore';

/** Yeniden gönderme bekleme süresi (sn) — kayıt e-postası az önce gitti; art arda basışı keser. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** Başarısız denemeden (ağ / 5xx) sonra kısa bekleme — art arda basışla sunucuyu yormamak için. */
export const RESEND_FAILURE_COOLDOWN_SECONDS = 15;

const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;

/**
 * "Doğrulama e-postasını tekrar gönder" (web `useRegister.resendVerification`:
 * `POST /auth/resend-verification`, oturumsuz, yalnız e-posta). Bekleme süresi e-posta anahtarlı
 * store'da (`resendCooldownStore`) — ekran yeniden kurulunca sıfırlanmaz; kayıt anında başlatılır,
 * her başarılı gönderimde 60 sn, hatada (429 dahil) kısa bekleme kurulur.
 *
 * `neutral` (misafir, adresi kendisi yazdı): sunucu yanıtı hesabın varlığını belli etmesin diye
 * her sunucu yanıtında (başarı / 4xx / 429) TEK sabit metin gösterilir; yalnız ağ hatası ayrı
 * bildirilir. Toast'lar `useAppMutation`'da.
 */
export function useResendVerification(
  email: string | null,
  { neutral = false, onSent }: { neutral?: boolean; onSent?: (email: string) => void } = {},
) {
  const { t } = useTranslation();
  const key = email ? cooldownKey(email) : null;
  const until = useResendCooldownStore((s) => (key ? (s.until[key] ?? 0) : 0));
  // Yalnız yeniden çizim tetikleyicisi: kalan süre `Date.now()`'dan hesaplanır (bayat değer yok).
  const [, setTick] = useState(0);

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setTimeout(() => setTick((n) => n + 1), 1000);
    return () => clearTimeout(id);
  });

  const cooldown = Math.max(0, Math.ceil((until - Date.now()) / 1000));

  const mutation = useAppMutation((to: string) => authApi.resendVerification(to), {
    success: neutral ? t('auth.verifyResentNeutral') : t('auth.verificationEmailResent'),
    error: t('auth.couldNotResendEmail'),
    silentError: neutral,
    onSuccess: (_d, to) => {
      startResendCooldown(to, RESEND_COOLDOWN_SECONDS);
      onSent?.(to);
    },
    onError: (e, to) => {
      const status = statusOf(e);
      startResendCooldown(
        to,
        status === 429 ? RESEND_COOLDOWN_SECONDS : RESEND_FAILURE_COOLDOWN_SECONDS,
      );
      if (!neutral) return;
      // Misafir: ağ hatası dışında hesap varlığı sızdırılmaz — sunucu ne derse desin aynı metin.
      if (status === undefined) toast.error(t('error.offlineMessage'));
      else toast.success(t('auth.verifyResentNeutral'));
    },
  });

  const resend = () => {
    if (!email || cooldown > 0 || mutation.isPending) return;
    mutation.mutate(email);
  };

  return { resend, cooldown, isPending: mutation.isPending };
}
