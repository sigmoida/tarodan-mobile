import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Button, Modal, ModalFooter, Spinner, Input, Text, ModalMessage } from '@/ui';

import { PhoneInput } from '@/components/common';

import { styles } from '../_lib/styles';
import type { SecurityController } from '../_hooks/useSecurity';

/** All 5 security modals: password change, 2FA setup/disable, phone verify, backup codes. */
export function SecurityDialogs({ f }: { f: SecurityController }) {
  const { t } = f;
  const closePassword = () => { f.setShowPasswordDialog(false); f.pwMsg.clear(); };
  const closeSetup = () => { f.setShowTwoFactorSetup(false); f.twoFaMsg.clear(); };
  const closeDisable = () => { f.setShowDisableDialog(false); f.disableMsg.clear(); };
  const closeRegenerate = () => { f.setShowRegenerateDialog(false); f.regenMsg.clear(); };
  return (
    <>
      {/* Password Change Dialog */}
      <Modal
        isOpen={f.showPasswordDialog}
        onClose={closePassword}
        title={t('security.changePasswordTitle')}
        footer={
          <ModalFooter
            onCancel={closePassword}
            onConfirm={f.handlePasswordChange}
            cancelLabel={t('mobile.cancel')}
            confirmLabel={t('mobile.change')}
            disabled={f.loading}
          />
        }
      >
        <Input
          label={t('security.currentPassword')}
          value={f.currentPassword}
          onChangeText={f.setCurrentPassword}
          secureTextEntry
          containerStyle={styles.dialogInput}
        />
        <Input
          label={t('security.newPassword')}
          value={f.newPassword}
          onChangeText={f.setNewPassword}
          secureTextEntry
          containerStyle={styles.dialogInput}
        />
        <Input
          label={t('security.newPasswordRepeat')}
          value={f.confirmPassword}
          onChangeText={f.setConfirmPassword}
          secureTextEntry
          containerStyle={styles.dialogInput}
        />
        <ModalMessage state={f.pwMsg.state} />
      </Modal>

      {/* 2FA Setup Dialog */}
      <Modal
        isOpen={f.showTwoFactorSetup}
        onClose={closeSetup}
        title={t('security.twoFactorSetupModalTitle')}
        footer={
          <ModalFooter
            onCancel={closeSetup}
            onConfirm={f.handleVerifyTwoFactor}
            cancelLabel={t('mobile.cancel')}
            confirmLabel={t('mobile.verify')}
            disabled={f.loading}
          />
        }
      >
        <Text variant="bodySm" tone="muted" style={styles.dialogText}>
          Google Authenticator veya benzeri bir uygulamayı kullanarak aşağıdaki kodu tarayın veya manuel olarak girin:
        </Text>
        {f.totpQrImage ? (
          <Image
            source={{ uri: f.totpQrImage }}
            style={styles.qrImage}
            accessibilityLabel={t('security.twoFactorQrAlt')}
          />
        ) : null}
        {f.totpSecret ? (
          <View style={styles.secretContainer}>
            <Text variant="bodySm" style={styles.secretText}>{f.totpSecret}</Text>
          </View>
        ) : (
          <Spinner size="sm" />
        )}
        <Input
          label={t('security.verificationCode')}
          value={f.verificationCode}
          onChangeText={f.setVerificationCode}
          keyboardType="numeric"
          maxLength={6}
          containerStyle={styles.dialogInput}
        />
        <ModalMessage state={f.twoFaMsg.state} />
      </Modal>

      {/* 2FA Disable Dialog — backend geçerli TOTP kodu ister */}
      <Modal
        isOpen={f.showDisableDialog}
        onClose={closeDisable}
        title={t('security.twoFactorDisableModalTitle')}
        footer={
          <ModalFooter
            onCancel={closeDisable}
            onConfirm={f.confirmDisableTwoFactor}
            cancelLabel={t('mobile.cancel')}
            confirmLabel={t('security.disableTwoFactor')}
            destructive
            disabled={f.loading}
          />
        }
      >
        <Text variant="bodySm" tone="muted" style={styles.dialogText}>
          İki faktörlü doğrulamayı kapatmak için uygulamanızdaki 6 haneli kodu girin.
        </Text>
        <Input
          label={t('security.verificationCode')}
          value={f.disableCode}
          onChangeText={f.setDisableCode}
          keyboardType="numeric"
          maxLength={6}
          containerStyle={styles.dialogInput}
        />
        <ModalMessage state={f.disableMsg.state} />
      </Modal>

      {/* Phone Verification Dialog */}
      <Modal isOpen={f.showPhoneDialog} onClose={() => { f.setShowPhoneDialog(false); f.setPhoneMsg(null); }} title={t('security.phoneVerificationTitle')}>
        {f.phoneStep === 'enter' ? (
          <View style={styles.dialogStack}>
            <PhoneInput
              label={t('security.phoneNumber')}
              // Gönderime basmadan görsün: çözülemeyen numara blur'da uyarır.
              validateOnBlur
              countryCode={f.phoneCountryCode}
              onCountryCodeChange={f.setPhoneCountryCode}
              phone={f.phoneInput}
              onPhoneChange={(phone) => {
                f.setPhoneInput(phone);
                f.setPhoneMsg(null);
              }}
              testID="phone-input"
              containerStyle={styles.dialogInput}
            />
            <Button title={t('security.sendCode')} onPress={f.handleSendPhoneCode} disabled={f.loading || !f.phoneInput} isLoading={f.loading} />
          </View>
        ) : (
          <View style={styles.dialogStack}>
            <Input
              label={t('security.verificationCodeLower')}
              value={f.phoneCode}
              onChangeText={f.setPhoneCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              testID="phone-code-input"
              containerStyle={styles.dialogInput}
            />
            <Button title={t('security.verify')} onPress={f.handleVerifyPhone} disabled={f.loading || f.phoneCode.length !== 6} isLoading={f.loading} />
            <Pressable onPress={f.handleSendPhoneCode} disabled={f.resendIn > 0 || f.loading}>
              <Text variant="bodySm" tone="muted" align="center">
                {f.resendIn > 0 ? t('security.resendIn', { seconds: f.resendIn }) : t('security.resendCode')}
              </Text>
            </Pressable>
          </View>
        )}
        {f.phoneMsg && (
          <Text
            testID="phone-message"
            variant="bodySm"
            tone={f.phoneMsg.type === 'error' ? 'danger' : 'muted'}
            style={styles.phoneMessage}
          >
            {f.phoneMsg.text}
          </Text>
        )}
      </Modal>

      {/* 2FA Backup Codes Regenerate Dialog */}
      <Modal
        isOpen={f.showRegenerateDialog}
        onClose={closeRegenerate}
        title={t('security.regenerateBackupCodes')}
        footer={
          f.newBackupCodes ? (
            <Button variant="primary" fullWidth title={t('common.ok')} onPress={() => f.setShowRegenerateDialog(false)} />
          ) : (
            <ModalFooter
              onCancel={closeRegenerate}
              onConfirm={f.handleRegenerateBackupCodes}
              cancelLabel={t('mobile.cancel')}
              confirmLabel={t('security.regenerate')}
              disabled={f.loading}
            />
          )
        }
      >
        {f.newBackupCodes ? (
          <>
            <Text variant="bodySm" tone="muted" style={styles.dialogText}>
              Yeni yedek kodlarınız. Güvenli bir yerde saklayın — eski kodlar artık geçersiz.
            </Text>
            <View style={styles.secretContainer}>
              {f.newBackupCodes.map((code) => (
                <Text key={code} variant="bodySm" style={styles.secretText}>
                  {code}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text variant="bodySm" tone="muted" style={styles.dialogText}>
              Yeni yedek kodlar üretmek için uygulamanızdaki 6 haneli kodu girin.
            </Text>
            <Input
              label={t('security.verificationCode')}
              value={f.regenerateCode}
              onChangeText={f.setRegenerateCode}
              keyboardType="numeric"
              maxLength={6}
              containerStyle={styles.dialogInput}
            />
            <ModalMessage state={f.regenMsg.state} />
          </>
        )}
      </Modal>
    </>
  );
}
