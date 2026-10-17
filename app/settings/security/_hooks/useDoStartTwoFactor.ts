import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { toTwoFactorSetup } from '../_lib/types';

/**
 * 2FA kurulumunu başlat (`POST /security/2fa/enable`) → QR + gizli anahtar + yedek kodlar.
 * Hata toast'ı yok: ekran hatayı `ErrorState` + "Tekrar dene" olarak gösterir.
 */
export function useDoStartTwoFactor() {
  return useAppMutation(async () => toTwoFactorSetup((await authApi.setupTwoFactor()).data), {
    silentError: true,
    // Gizli anahtar / yedek kodlar MutationCache'te (varsayılan 5 dk) tutulmasın.
    mutation: { gcTime: 0 },
  });
}
