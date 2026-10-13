import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDoDisableTwoFactor } from '../_hooks/useDoDisableTwoFactor';
import { TwoFactorCodeModal } from './TwoFactorCodeModal';

/** 2FA'yı kapat — yıkıcı, tek alan (TOTP). Mutation burada; başarı/hata toast'ı hook'ta. */
export function DisableTwoFactorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const disable = useDoDisableTwoFactor();
  return (
    <TwoFactorCodeModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('profile.twoFactor.disableTitle')}
      hint={t('profile.twoFactor.disableIntro')}
      warning={{
        title: t('profile.twoFactor.disableWarningTitle'),
        body: t('profile.twoFactor.disableWarning'),
      }}
      confirmLabel={t('profile.twoFactor.disableAction')}
      destructive
      onSubmit={(code) => disable.mutate(code)}
      testID="two-factor-disable-modal"
    />
  );
}
