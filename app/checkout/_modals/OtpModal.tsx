import { useTranslation } from 'react-i18next';
import React from 'react';
import { Modal, Button, Input, Text, theme } from '@/ui';

const { colors } = theme;

/** Misafir e-posta doğrulama (OTP) modalı. */
export function OtpModal({
  visible,
  onClose,
  email,
  otpCode,
  setOtpCode,
  otpError,
  otpExpiresIn,
  otpSending,
  loading,
  onSubmit,
  onResend,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpError: string | null;
  otpExpiresIn: number;
  otpSending: boolean;
  loading: boolean;
  onSubmit: () => void;
  onResend: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={visible} onClose={onClose} title={t('auth.emailVerification')}>
      <Text style={{ marginBottom: theme.spacing[3], color: colors.text.muted }}>
        {t('checkout.otpSentToEmail', { email })}
      </Text>
      <Input
        label={t('security.verificationCodeLower')}
        value={otpCode}
        onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        error={otpError ?? undefined}
        testID="guest-otp-input"
      />
      <Button
        title={t('checkout.verifyAndPay')}
        onPress={onSubmit}
        disabled={otpCode.length !== 6}
        isLoading={loading}
        testID="guest-otp-submit"
      />
      <Button
        title={otpExpiresIn > 0 ? t('checkout.resendCodeWithTimer', { seconds: otpExpiresIn }) : t('checkout.resendCode')}
        variant="ghost"
        onPress={onResend}
        disabled={otpExpiresIn > 0 || otpSending}
        testID="guest-otp-resend"
      />
    </Modal>
  );
}
