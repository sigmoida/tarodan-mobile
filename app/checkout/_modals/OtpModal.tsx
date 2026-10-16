import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Text, theme } from '@/ui';

const { colors } = theme;

/** `resendAt`'e kalan saniye; yalnız modal açıkken ve süre dolmamışken saniyede bir tıklar. */
function useSecondsUntil(resendAt: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  // Yeni kod gönderildi (`resendAt` değişti): ilk karede bayat `now` ile şişkin süre görünmesin.
  const [seenResendAt, setSeenResendAt] = useState(resendAt);
  if (seenResendAt !== resendAt) {
    setSeenResendAt(resendAt);
    setNow(Date.now());
  }
  const ticking = active && resendAt > now;
  useEffect(() => {
    if (!ticking) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking, resendAt]);
  return Math.max(0, Math.ceil((resendAt - now) / 1000));
}

/**
 * Misafir e-posta doğrulama (OTP) modalı.
 *
 * Kod ve geri sayım BU bileşenin state'i: tuş vuruşu ve saniyelik tik yalnız modalı yeniden
 * çizer, checkout ekranını değil. Controller kodu temizlemek istediğinde `codeResetSeq`'i
 * artırır (yeni kod gönderildi / modal kapandı); gönderimde kod `onSubmit(code)` ile gider.
 */
export function OtpModal({
  visible,
  onClose,
  email,
  codeResetSeq,
  otpError,
  resendAt,
  otpSending,
  loading,
  onSubmit,
  onResend,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
  /** Değişince girilen kod temizlenir. */
  codeResetSeq: number;
  otpError: string | null;
  /** Kodun yeniden istenebileceği an (ms, `Date.now()` ölçeğinde). */
  resendAt: number;
  otpSending: boolean;
  loading: boolean;
  onSubmit: (code: string) => void;
  onResend: () => void;
}) {
  const { t } = useTranslation();
  const [otpCode, setOtpCode] = useState('');
  // Render sırasında sıfırlama (önceki prop'u sakla kalıbı): ek bir effect render'ı olmadan.
  const [seenResetSeq, setSeenResetSeq] = useState(codeResetSeq);
  if (seenResetSeq !== codeResetSeq) {
    setSeenResetSeq(codeResetSeq);
    setOtpCode('');
  }
  const secondsLeft = useSecondsUntil(resendAt, visible);

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
        onPress={() => onSubmit(otpCode)}
        disabled={otpCode.length !== 6}
        isLoading={loading}
        testID="guest-otp-submit"
      />
      <Button
        title={secondsLeft > 0 ? t('checkout.resendCodeWithTimer', { seconds: secondsLeft }) : t('checkout.resendCode')}
        variant="ghost"
        onPress={onResend}
        disabled={secondsLeft > 0 || otpSending}
        testID="guest-otp-resend"
      />
    </Modal>
  );
}
