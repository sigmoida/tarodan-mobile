import React from 'react';
import { View, Pressable } from 'react-native';
import { Badge, Switch, Button, SectionCard, Text } from '@/ui';
import { splitPhone } from '@/utils/phone';

import { styles } from '../_lib/styles';
import type { SecurityController } from '../_hooks/useSecurity';

/** Password / 2FA / phone-verification / sessions / tips sections (SectionCard). */
export function SecuritySections({ f }: { f: SecurityController }) {
  const { t } = f;
  return (
    <>
      {/* Password Section */}
      <SectionCard title={t('mobile.password')}>
        <Pressable
          style={styles.settingRow}
          onPress={() => { f.pwMsg.clear(); f.setShowPasswordDialog(true); }}
        >
          <View style={styles.settingText}>
            <Text variant="body" weight="medium">{t('security.changePasswordTitle')}</Text>
            <Text variant="bodySm" tone="muted">{t('security.lastChangeUnknown')}</Text>
          </View>
        </Pressable>
      </SectionCard>

      {/* Two-Factor Auth */}
      <SectionCard title={t('security.twoFactorSection')}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text variant="body" weight="medium">2FA</Text>
            <Text variant="bodySm" tone="muted">
              {f.twoFactorEnabled ? t('security.enabled') : t('security.disabled')}
            </Text>
          </View>
          <Switch
            value={f.twoFactorEnabled}
            onValueChange={(value: boolean) => {
              if (value) {
                f.handleSetupTwoFactor();
              } else {
                f.handleDisableTwoFactor();
              }
            }}
          />
        </View>
        <Text variant="bodySm" tone="muted" style={styles.infoText}>{t('security.twoFactorDesc')}</Text>
        {f.twoFactorEnabled ? (
          <Button
            variant="outline"
            title={t('security.regenerateBackupCodes')}
            onPress={() => {
              f.setNewBackupCodes(null);
              f.setRegenerateCode('');
              f.regenMsg.clear();
              f.setShowRegenerateDialog(true);
            }}
            style={styles.actionButton}
          />
        ) : null}
      </SectionCard>

      {/* Phone Verification */}
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
            onPress={() => {
              // Kayıtlı numara E.164 saklanıyor; alan ülke kodu + lokal parça
              // istiyor, ikisine ayır (yoksa "+90" tekrar yazılmış görünürdü).
              const seed = splitPhone(f.user?.phone || '');
              f.setPhoneCountryCode(seed.countryCode);
              f.setPhoneInput(seed.phone);
              f.setPhoneStep('enter');
              f.setPhoneCode('');
              f.setPhoneMsg(null);
              f.setShowPhoneDialog(true);
            }}
            testID="phone-verify-button"
            style={styles.actionButton}
          />
        )}
      </SectionCard>

      {/* Sessions */}
      <SectionCard title={t('mobile.sessions')}>
        <Pressable style={styles.settingRow} onPress={f.handleLogoutAllDevices}>
          <View style={styles.settingText}>
            <Text variant="body" weight="medium" tone="danger">
              Tüm Cihazlardan Çıkış
            </Text>
            <Text variant="bodySm" tone="muted">
              Diğer tüm cihazlarda oturumunuzu sonlandırın
            </Text>
          </View>
        </Pressable>
      </SectionCard>

      {/* Security Tips */}
      <SectionCard title={t('security.tipsSection')} bodyStyle={styles.tips}>
        <Text variant="bodySm">• {t('mobile.tipStrongPassword')}</Text>
        <Text variant="bodySm">• {t('mobile.tipTwoFactor')}</Text>
        <Text variant="bodySm">• {t('mobile.tipChangePassword')}</Text>
        <Text variant="bodySm">• {t('mobile.tipReportSuspicious')}</Text>
      </SectionCard>
    </>
  );
}
