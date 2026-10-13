import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDoRegenerateBackupCodes } from '../_hooks/useDoRegenerateBackupCodes';
import { TwoFactorCodeModal } from './TwoFactorCodeModal';

/**
 * Yeni yedek kodlar — tek alan (TOTP). Kodlar diyalogda DEĞİL, 2FA ekranının yedek kod kartında
 * gösterilir (`onCodes`): diyalog mutation'dan önce kapanır (§12).
 */
export function RegenerateBackupCodesModal({
  isOpen,
  onClose,
  onCodes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCodes: (codes: string[]) => void;
}) {
  const { t } = useTranslation();
  const regenerate = useDoRegenerateBackupCodes();
  return (
    <TwoFactorCodeModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.twoFactor.regenerate')}
      hint={t('profile.twoFactor.regenerateHint')}
      confirmLabel={t('common.create')}
      onSubmit={(code) => regenerate.mutate(code, { onSuccess: onCodes })}
      testID="regenerate-codes-modal"
    />
  );
}
