import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useFullScreenGateShown } from '@/components/common/FullScreenGate';
import {
  dismissLegalIdentitySavedNotice,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';

/**
 * "Kimlik bilgileriniz kaydedildi" (web `useLegalIdentity` →
 * `successMessage: identity.gate.saved`). Kapı native Modal olduğundan
 * bildirim yalnız tam ekran kapı KAPANDIKTAN sonra `toast.success` olarak çıkar;
 * kapının içinde bildirim gösterilmez. Görsel yok: bileşen yalnız tetikleyicidir.
 */
export function LegalIdentitySavedNotice() {
  const { t } = useTranslation();
  const pending = useLegalIdentityRequestStore((s) => s.savedNotice);
  const gateShown = useFullScreenGateShown();

  useEffect(() => {
    if (!pending || gateShown) return;
    dismissLegalIdentitySavedNotice();
    toast.success(t('identity.gate.saved'));
  }, [pending, gateShown, t]);

  return null;
}
