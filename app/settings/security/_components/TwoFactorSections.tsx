import React from 'react';
import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, ButtonRow, IconButton, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import type { MessageKey } from '@/i18n/lib';

import { styles } from '../_lib/styles';
import { toSixDigits } from '../_lib/schema';
import { REQUIREMENT_KEYS, WHY_2FA_MATTERS_KEYS } from '../_lib/types';
import type { TwoFactorFlow } from '../_hooks/useTwoFactorFlow';

/** Durum kartı (web `StatusCard`). */
export function TwoFactorStatusCard({ isEnabled }: { isEnabled: boolean }) {
  const { t } = useTranslation();
  return (
    <SectionCard>
      <View style={styles.settingRow}>
        <View style={styles.settingText}>
          <Text variant="body" weight="semibold">{t('settings.twoFactorTitle')}</Text>
          <Text variant="bodySm" tone="muted">
            {isEnabled ? t('settings.twoFactorEnabledDesc') : t('settings.twoFactorDisabledDesc')}
          </Text>
        </View>
        <Badge variant={isEnabled ? 'success' : 'outline'} testID="two-factor-status-badge">
          {isEnabled ? t('common.active') : t('common.inactive')}
        </Badge>
      </View>
    </SectionCard>
  );
}

function Bullets({ keys }: { keys: readonly MessageKey[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.list}>
      {keys.map((key) => (
        <Text key={key} variant="bodySm" tone="muted">
          • {t(key)}
        </Text>
      ))}
    </View>
  );
}

/** Kurulum öncesi tanıtım (web `SetupIntro`); "Kurulumu Başlat" alt çubukta. */
export function SetupIntro() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('profile.twoFactor.enable')} bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted">{t('profile.twoFactor.intro')}</Text>
      <Text variant="bodySm" weight="medium">{t('profile.twoFactor.requirementsTitle')}</Text>
      <Bullets keys={REQUIREMENT_KEYS} />
    </SectionCard>
  );
}

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
 * Kurulum (web `SetupFlow`): 1) QR'ı tara / anahtarı kopyala, 2) 6 haneli kodu gir. Kullanıcı
 * Authenticator'a geçip döndüğünde QR ve anahtar ekranda kalır; "Doğrula" alt çubukta.
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
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
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

/** "2FA neden önemli?" (web `WhyItMatters`). */
export function WhyItMatters() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('profile.twoFactor.whyTitle')}>
      <Bullets keys={WHY_2FA_MATTERS_KEYS} />
    </SectionCard>
  );
}

/** Alt çubuk: görünüme göre tek ana aksiyon (klavyenin üstünde kalır). */
export function TwoFactorFooter({ f }: { f: TwoFactorFlow }) {
  const { t } = useTranslation();
  switch (f.view) {
    case 'intro':
      return (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('profile.twoFactor.startSetup')}
          onPress={f.startSetup}
          isLoading={f.isStarting}
          disabled={f.isStarting}
          testID="two-factor-start"
        />
      );
    case 'setup':
      return (
        <ButtonRow stackOrder="reverse">
          <Button variant="outline" size="lg" title={t('common.cancel')} onPress={f.cancelSetup} />
          <Button
            variant="primary"
            size="lg"
            title={t('profile.twoFactor.verifyAndEnable')}
            onPress={f.submitVerify}
            isLoading={f.isVerifying}
            disabled={!f.canVerify}
            testID="two-factor-verify"
          />
        </ButtonRow>
      );
    case 'codes':
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
    default:
      return null;
  }
}
