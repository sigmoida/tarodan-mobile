import React from 'react';
import { Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PhoneInput } from '@/components/common';
import { useSecondsUntil } from '@/hooks/useSecondsUntil';

import { styles } from '../_lib/styles';
import { boldSegments } from '../_lib/types';
import { toSixDigits } from '../_lib/schema';
import type { PhoneVerificationFlow } from '../_hooks/usePhoneVerificationFlow';

/** Adım 1 — numara (web PhoneVerificationModal `enter`). Gönder düğmesi PageShell alt çubuğunda. */
export function PhoneEnterStep({ f }: { f: PhoneVerificationFlow }) {
  const { t } = useTranslation();
  return (
    <SectionCard bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted">
        {t('profile.security.phoneVerifyPrompt')}
      </Text>
      <Controller
        control={f.phoneForm.control}
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneInput
            label={t('profile.security.phoneNumber')}
            // Gönderime basmadan görsün: çözülemeyen numara blur'da uyarır.
            validateOnBlur
            phone={field.value ?? ''}
            onPhoneChange={field.onChange}
            error={fieldState.error?.message}
            testID="phone-input"
          />
        )}
      />
    </SectionCard>
  );
}

/** Adım 2 — SMS kodu + yeniden gönder geri sayımı. Doğrula düğmesi alt çubukta. */
export function PhoneCodeStep({ f }: { f: PhoneVerificationFlow }) {
  const { t } = useTranslation();
  const hint = boldSegments(t('profile.security.phoneCodeSentTo', { phone: f.sentTo }));
  return (
    <SectionCard bodyStyle={styles.stack}>
      <Text variant="bodySm" tone="muted" testID="phone-code-hint">
        {hint.map((s, i) =>
          s.bold ? (
            <Text key={i} variant="bodySm" weight="semibold" tone="heading">
              {s.text}
            </Text>
          ) : (
            s.text
          ),
        )}
      </Text>
      <Form form={f.codeForm}>
        <FormInput
          name="code"
          label={t('profile.verificationCode')}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          transform={toSixDigits}
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          autoFocus
          testID="phone-code-input"
        />
      </Form>
      <PhoneResendButton resendAt={f.resendAt} isSending={f.isSending} onPress={f.resend} />
    </SectionCard>
  );
}

/** Yeniden gönder + saniyelik geri sayım — tik YALNIZ bu düğmeyi yeniden çizer. */
function PhoneResendButton({
  resendAt,
  isSending,
  onPress,
}: {
  resendAt: number;
  isSending: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const resendIn = useSecondsUntil(resendAt);
  const canResend = resendIn <= 0 && !isSending;
  return (
    <Pressable
      onPress={onPress}
      disabled={!canResend}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canResend }}
      style={styles.resend}
      testID="phone-resend"
    >
      <Text variant="bodySm" tone={canResend ? 'primary' : 'muted'} align="center">
        {resendIn > 0 ? t('security.resendIn', { seconds: resendIn }) : t('security.resendCode')}
      </Text>
    </Pressable>
  );
}
