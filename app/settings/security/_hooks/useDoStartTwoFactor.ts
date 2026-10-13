import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { toTwoFactorSetup } from '../_lib/types';

/** 2FA kurulumunu başlat (`POST /security/2fa/enable`) → QR + gizli anahtar + yedek kodlar. */
export function useDoStartTwoFactor() {
  return useAppMutation(async () => toTwoFactorSetup((await authApi.setupTwoFactor()).data), {
    error: () => i18n.t('profile.twoFactor.setupFailed'),
  });
}
