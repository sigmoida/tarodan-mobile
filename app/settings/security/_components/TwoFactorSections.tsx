import React from 'react';
import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, IconButton, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';

import { styles } from '../_lib/styles';
import { toSixDigits } from '../_lib/schema';
import type { TwoFactorFlow } from '../_hooks/useTwoFactorFlow';

function StepHead({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.stepHead}>
      <View style={styles.stepDot}>
        <Text variant="caption" weight="medium" tone="inverted">{n}</Text>
      </View>
      <Text variant="body" weight="medium">{title}</Text>
    </View>
  );
}

/**
 * Kurulum (web `SetupFlow`) — 2FA kapalıyken ekranın TEK içeriği: 1) QR'ı tara / anahtarı kopyala,
 * 2) 6 haneli kodu gir. Kullanıcı Authenticator'a geçip döndüğünde QR ve anahtar ekranda kalır;
 * "Doğrula ve Etkinleştir" alt çubukta; yanlış kod hatası alanın altında.
 */
export function SetupFlow({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  if (!f.setup) return null;
  return (
    <SectionCard title={t('profile.twoFactor.setupTitle')} bodyStyle={styles.stack}>
      <StepHead n={1} title={t('profile.twoFactor.stepScanQr')} />
      <Text variant="bodySm" tone="muted">{t('profile.twoFactor.scanHint')}</Text>
      <View style={styles.qrFrame}>
        {f.setup.qrCodeImage ? (
          <Image
            source={{ uri: f.setup.qrCodeImage }}
            style={styles.qrImage}
            accessibilityLabel={t('security.twoFactorQrAlt')}
            testID="two-factor-qr"
          />
        ) : (
          <View style={styles.qrFallback}>
            <Text variant="bodySm" tone="subtle" align="center">
              {t('profile.twoFactor.qrLoadFailed')}
            </Text>
          </View>
        )}
      </View>
      <Text variant="bodySm" tone="muted">{t('profile.twoFactor.manualHint')}</Text>
      <View style={styles.secretRow}>
        <View style={styles.secretBox}>
          <Text variant="bodySm" style={styles.mono} selectable testID="two-factor-secret">
            {f.setup.secret}
          </Text>
        </View>
        <IconButton
          icon="clipboard-document"
          variant="secondary"
          size="md"
          accessibilityLabel={t('common.copy')}
          onPress={f.copySecret}
          testID="two-factor-copy-secret"
        />
      </View>

      <StepHead n={2} title={t('profile.twoFactor.stepEnterCode')} />
      <Text variant="bodySm" tone="muted">{t('profile.twoFactor.enterCodeHint')}</Text>
      <Form form={f.codeForm}>
        <FormInput
          name="code"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          transform={toSixDigits}
          // TOTP (Authenticator) kodu — SMS değil: iOS "Mesajlar'dan" / Android SMS önerisi kapalı
          // (son gelen telefon doğrulama SMS'i önerilip yanlış kod gönderilebiliyordu).
          autoComplete="off"
          textContentType="none"
          inputStyle={styles.codeInput}
          accessibilityLabel={t('security.verificationCode')}
          testID="two-factor-code-input"
        />
      </Form>
    </SectionCard>
  );
}

/** Yedek kodlar (web `BackupCodesModal`'ın ekran içi hâli) — kurulum sonrası ve yenilemede. */
export function BackupCodesCard({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  if (!f.shownCodes) return null;
  const title =
    f.shownCodes.source === 'setup'
      ? t('profile.twoFactor.enabledTitle')
      : t('profile.twoFactor.backupCodesTitle');
  return (
    <SectionCard title={title} bodyStyle={styles.stack} testID="backup-codes-card">
      <Text variant="bodySm" tone="muted">{t('profile.twoFactor.saveCodesHint')}</Text>
      <Alert variant="warning" title={t('legal.important')}>
        {t('profile.twoFactor.oneTimeWarning')}
      </Alert>
      <View style={styles.codesGrid}>
        {f.shownCodes.codes.map((code) => (
          <View key={code} style={styles.codeCell}>
            <Text variant="bodySm" style={styles.mono} selectable>
              {code}
            </Text>
          </View>
        ))}
      </View>
      <Button
        variant="outline"
        fullWidth
        title={t('profile.twoFactor.copyAllCodes')}
        onPress={f.copyCodes}
        testID="backup-codes-copy"
      />
    </SectionCard>
  );
}

/** 2FA açıkken: yedek kod yenile + kapat (web `EnabledOptions`); kod girişi diyalogda. */
export function EnabledOptions({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard title={t('profile.twoFactor.backupCodesTitle')} bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">{t('profile.twoFactor.backupCodesIntro')}</Text>
        <Button
          variant="secondary"
          fullWidth
          title={t('profile.twoFactor.regenerate')}
          onPress={() => f.openDialog('regenerate')}
          testID="two-factor-regenerate"
        />
      </SectionCard>
      <SectionCard title={t('profile.twoFactor.disableTitle')} bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">{t('profile.twoFactor.disableIntro')}</Text>
        <Button
          variant="danger"
          fullWidth
          title={t('profile.twoFactor.disableTitle')}
          onPress={() => f.openDialog('disable')}
          testID="two-factor-disable"
        />
      </SectionCard>
    </>
  );
}

/**
 * An account without a password cannot turn 2FA on (web `/profile/security` hint): the reason
 * and "Set a password" (the set-password screen, or the mail where this device cannot confirm).
 */
export function NeedsPasswordCard({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  if (f.view !== 'needsPassword') return null;
  return (
    <SectionCard title={t('profile.security.twoFactor')} bodyStyle={styles.stack} testID="two-factor-needs-password">
      <Text variant="bodySm" tone="muted">{t('profile.security.passwordFirstFor2fa')}</Text>
      <Button
        variant="outline"
        fullWidth
        title={t('auth.setPassword')}
        onPress={f.openSetPassword}
        isLoading={f.sendingSetPasswordMail}
        disabled={f.sendingSetPasswordMail}
        testID="two-factor-set-password"
      />
    </SectionCard>
  );
}

/** Alt çubuk: görünüme göre tek ana aksiyon (klavyenin üstünde kalır). */
export function TwoFactorFooter({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  if (f.view === 'setup' && f.setup) {
    // Uzunluğa göre kilitlenmez: her basış geri bildirim verir (eksik kod → alanın altında uyarı).
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t('profile.twoFactor.verifyAndEnable')}
        onPress={f.submitVerify}
        isLoading={f.isVerifying}
        testID="two-factor-verify"
      />
    );
  }
  if (f.view === 'codes') {
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t('profile.twoFactor.savedAck')}
        onPress={f.ackCodes}
        testID="backup-codes-ack"
      />
    );
  }
  return null;
}
