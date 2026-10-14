import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDoDisableTwoFactor } from '../_hooks/useDoDisableTwoFactor';
import { TwoFactorCodeModal } from './TwoFactorCodeModal';

/**
 * 2FA'yı kapat — yıkıcı, tek alan (TOTP). Mutation burada; başarı/hata toast'ı hook'ta.
 * `onDisabled`: başarıdan sonra (modal zaten kapalı) — ekran güvenlik ana ekranına döner.
 */
export function DisableTwoFactorModal({
  isOpen,
  onClose,
  onDisabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDisabled?: () => void;
}) {
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
      onSubmit={(code) => disable.mutate(code, { onSuccess: () => onDisabled?.() })}
      testID="two-factor-disable-modal"
    />
  );
}
