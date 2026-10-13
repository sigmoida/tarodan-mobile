import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, SectionCard, Text, theme } from '@/ui';

import { styles } from '../_lib/styles';
import type { SecurityHub } from '../_hooks/useSecurityHub';

const ripple = { color: theme.colors.overlay.black10 };

/** Şifre / 2FA / telefon doğrulama / oturumlar / ipuçları bölümleri (SectionCard). */
export function SecuritySections({ f }: { f: SecurityHub }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard title={t('mobile.password')}>
        <Pressable
          style={styles.settingRow}
          onPress={f.openPassword}
          android_ripple={ripple}
          accessibilityRole="button"
          testID="security-password-row"
        >
          <View style={styles.settingText}>
            <Text variant="body" weight="medium">{t('security.changePasswordTitle')}</Text>
            <Text variant="bodySm" tone="muted">{t('security.lastChangeUnknown')}</Text>
          </View>
        </Pressable>
      </SectionCard>

      <SectionCard
        title={t('security.twoFactorSection')}
        badge={
          f.twoFactorEnabled ? (
            <Badge variant="success" size="sm">{t('common.active')}</Badge>
          ) : undefined
        }
      >
        <View style={styles.settingRow}>
          <Text variant="bodySm" tone="muted" style={styles.settingText}>
            {f.twoFactorEnabled
              ? t('profile.security.twoFactorOn')
              : t('profile.security.twoFactorOff')}
          </Text>
          <Button
            variant="outline"
            size="sm"
            title={f.twoFactorEnabled ? t('profile.security.manage') : t('profile.security.setUp')}
            onPress={f.openTwoFactor}
            testID="two-factor-manage-button"
          />
        </View>
      </SectionCard>

      <SectionCard
        title={t('security.phoneSection')}
        badge={
          f.phoneVerified ? (
            <Badge variant="success" size="sm">{t('security.verified')}</Badge>
          ) : undefined
        }
      >
        <View style={styles.settingText}>
          <Text variant="body" weight="medium">{t('security.phoneVerificationTitle')}</Text>
          <Text variant="bodySm" tone="muted">
            {f.phoneVerified ? t('security.phoneVerifiedNotice') : t('security.phoneVerifyHint')}
          </Text>
        </View>
        {!f.phoneVerified && (
          <Button
            title={t('security.verify')}
            onPress={f.openPhone}
            testID="phone-verify-button"
            style={styles.actionButton}
          />
        )}
      </SectionCard>

      <SectionCard title={t('mobile.sessions')}>
        <Pressable
          style={styles.settingRow}
          onPress={f.logoutAllDevices}
          disabled={f.logoutAllPending}
          android_ripple={ripple}
          accessibilityRole="button"
          testID="security-logout-all"
        >
          <View style={styles.settingText}>
            <Text variant="body" weight="medium" tone="danger">
              {t('security.logoutAllTitle')}
            </Text>
            <Text variant="bodySm" tone="muted">{t('security.logoutAllHint')}</Text>
          </View>
        </Pressable>
      </SectionCard>

      <SectionCard title={t('security.tipsSection')} bodyStyle={styles.tips}>
        <Text variant="bodySm">• {t('mobile.tipStrongPassword')}</Text>
        <Text variant="bodySm">• {t('mobile.tipTwoFactor')}</Text>
        <Text variant="bodySm">• {t('mobile.tipChangePassword')}</Text>
        <Text variant="bodySm">• {t('mobile.tipReportSuspicious')}</Text>
      </SectionCard>
    </>
  );
}
