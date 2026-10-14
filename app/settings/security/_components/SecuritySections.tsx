import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/ui';

import type { SecurityHub } from '../_hooks/useSecurityHub';
import { SettingsActionCard } from './SettingsActionCard';

/** Şifre / 2FA / telefon doğrulama / oturumlar / hesabı sil — hepsi aynı kart kalıbı (`SettingsActionCard`). */
export function SecuritySections({ f }: { f: SecurityHub }) {
  const { t } = useTranslation();
  return (
    <>
      <SettingsActionCard
        title={t('mobile.password')}
        description={t('profile.security.passwordDesc')}
        action={{
          label: t('profile.change'),
          onPress: f.openPassword,
          testID: 'security-password-button',
        }}
      />

      <SettingsActionCard
        title={t('security.twoFactorSection')}
        badge={
          f.twoFactorEnabled ? (
            <Badge variant="success" size="sm">{t('common.active')}</Badge>
          ) : undefined
        }
        description={
          f.twoFactorEnabled ? t('profile.security.twoFactorOn') : t('profile.security.twoFactorOff')
        }
        action={{
          label: f.twoFactorEnabled ? t('profile.security.manage') : t('profile.security.setUp'),
          onPress: f.openTwoFactor,
          testID: 'two-factor-manage-button',
        }}
      />

      <SettingsActionCard
        title={t('security.phoneSection')}
        badge={
          f.phoneVerified ? (
            <Badge variant="success" size="sm">{t('security.verified')}</Badge>
          ) : undefined
        }
        description={
          f.phoneVerified ? t('security.phoneVerifiedNotice') : t('security.phoneVerifyHint')
        }
        action={
          f.phoneVerified
            ? undefined
            : { label: t('security.verify'), onPress: f.openPhone, testID: 'phone-verify-button' }
        }
      />

      <SettingsActionCard
        title={t('security.logoutAllTitle')}
        description={t('security.logoutAllHint')}
        action={{
          label: t('common.logout'),
          onPress: f.logoutAllDevices,
          destructive: true,
          disabled: f.logoutAllPending,
          isLoading: f.logoutAllPending,
          testID: 'security-logout-all',
        }}
      />

      {/* Hesabı sil — profil sekmesinden buraya taşındı (web `DangerZoneSection` eşi): yazarak onaylanan
          ayrı ekrana (`settings/delete-account`) gider; silme burada çağrılmaz. */}
      <SettingsActionCard
        title={t('settings.dangerZone')}
        description={t('settings.deleteAccountDetails')}
        action={{
          label: t('settings.deleteAccount'),
          onPress: f.openDeleteAccount,
          destructive: true,
          testID: 'security-delete-account',
        }}
      />
    </>
  );
}
