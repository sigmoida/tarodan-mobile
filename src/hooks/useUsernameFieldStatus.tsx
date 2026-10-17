import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Spinner, theme } from '@/ui';
import type { UsernameAvailability } from './useUsernameAvailability';

export interface UsernameFieldStatus {
  /** Alanın hata satırı (yoksa `undefined`). */
  error: string | undefined;
  /** Hata yokken gösterilecek yardım satırı ("kontrol ediliyor" / uygun / bekle). */
  helper: string | undefined;
  /** Alanın sağındaki durum simgesi (spinner / onay). */
  statusIcon: ReactNode;
}

/**
 * Kullanıcı adı alanının durum slotu — kayıt ve profilde "kullanıcı adı belirle"
 * için TEK kaynak (CLAUDE.md › Principles). `Input` tek satır gösterdiği için TEK öncelik sırası:
 *   1) zod format hatası (submit sonrası)  2) ham biçim uyarısı (ANINDA, submit
 *   beklemeden — Türkçe büyük 'İ'.toLowerCase() birleşik noktalı 'i' üretir,
 *   alanda gözle doğru görünür ama regex'i geçmez)  3) "kontrol ediliyor"
 *   4) uygunluk sonucu.
 * "Kontrol ediliyor" ADIMI ATLANMAZ: aksi halde henüz sorulmamış bir ad için
 * eski sonucun kırmızısı görünür ve buton sessizce kilitli kalır.
 */
export function useUsernameFieldStatus(
  availability: UsernameAvailability,
  formError?: string,
): UsernameFieldStatus {
  const { t } = useTranslation();
  const { available, checking, isThrottled, isFormatInvalid } = availability;

  const rawFormatWarning =
    !formError && isFormatInvalid ? t('auth.usernameInvalidFormat') : undefined;
  const takenError =
    !formError && !rawFormatWarning && !checking && available === false
      ? t('auth.usernameTaken')
      : undefined;
  const error = formError || rawFormatWarning || takenError;
  const helper = error
    ? undefined
    : checking
      ? t('auth.usernameChecking')
      : isThrottled
        ? t('auth.usernameRateLimited')
        : available === true
          ? t('auth.usernameAvailable')
          : undefined;
  const statusIcon = checking ? (
    <Spinner size="sm" />
  ) : error ? null : available === true ? (
    <Icon
      name="check-circle"
      variant="solid"
      size={theme.iconSize.md}
      color={theme.colors.success[600]}
    />
  ) : null;

  return { error, helper, statusIcon };
}
