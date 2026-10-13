import React from 'react';
import { Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PhoneInput } from '@/components/common';

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
  const canResend = f.resendIn <= 0 && !f.isSending;
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
      <Pressable
        onPress={f.resend}
        disabled={!canResend}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canResend }}
        style={styles.resend}
        testID="phone-resend"
      >
        <Text variant="bodySm" tone={canResend ? 'primary' : 'muted'} align="center">
          {f.resendIn > 0
            ? t('security.resendIn', { seconds: f.resendIn })
            : t('security.resendCode')}
        </Text>
      </Pressable>
    </SectionCard>
  );
}
