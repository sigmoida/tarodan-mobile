import { useTranslation } from 'react-i18next';
import { Snackbar, theme, useHeaderTopInset } from '@/ui';
import { useFullScreenGateShown } from '@/components/common/FullScreenGate';
import {
  dismissLegalIdentitySavedNotice,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';

/**
 * "Kimlik bilgileriniz kaydedildi" (web `useLegalIdentity` →
 * `successMessage: identity.gate.saved`). Kapı native Modal olduğundan
 * bildirim yalnız tam ekran kapı KAPANDIKTAN sonra çıkar; kapının içinde
 * bildirim gösterilmez.
 *
 * Ekranın ÜSTÜNDE durur: kimlik çoğu zaman bir işlemin ortasında istenir ve
 * işlem (ör. banka hesabı) hemen kendi alttaki snackbar'ını gösterir; iki
 * bildirim üst üste binmesin.
 */
export function LegalIdentitySavedNotice() {
  const { t } = useTranslation();
  const topInset = useHeaderTopInset();
  const pending = useLegalIdentityRequestStore((s) => s.savedNotice);
  const gateShown = useFullScreenGateShown();

  return (
    <Snackbar
      visible={pending && !gateShown}
      onDismiss={dismissLegalIdentitySavedNotice}
      variant="success"
      style={{ top: topInset + theme.spacing[2], bottom: 'auto' }}
      testID="identity-saved-notice"
    >
      {t('identity.gate.saved')}
    </Snackbar>
  );
}

