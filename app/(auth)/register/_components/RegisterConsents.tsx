import React from 'react';
import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Checkbox, Text } from '@/ui';
import { useRichMessage } from '@/hooks/useRichMessage';
import type { RegisterController } from '../_hooks/useRegister';

/** Metin içi bağlantı — onay kutusu etiketinin içinde, hap/düğme olmadan (web `Link`). */
const inlineLink = (label: string, href: string, testID?: string) => (
  <Text
    variant="bodySm"
    tone="primary"
    weight="medium"
    testID={testID}
    accessibilityRole="link"
    onPress={() => router.push(href as never)}
  >
    {label}
  </Text>
);

/**
 * Üç onay kutusu (web `RegisterForm`): Kullanım Şartları + Gizlilik, KVKK Aydınlatma Metni
 * (ikisi zorunlu) ve pazarlama izni (isteğe bağlı). Bağlantılar etiketin İÇİNDE (`t.rich`
 * karşılığı `useRichMessage`); ayrı KVKK sayfası yok, web gibi `/privacy`'ye gider.
 */
export function RegisterConsents({ f }: { f: RegisterController }) {
  const { t } = useTranslation();
  const { control, errors } = f;

  const termsLabel = useRichMessage('auth.termsAgreeRich', {
    terms: (chunks) => inlineLink(chunks, '/terms'),
    privacy: (chunks) => inlineLink(chunks, '/privacy'),
  });
  const kvkkLabel = useRichMessage('auth.kvkkAgreeRich', {
    kvkk: (chunks) => inlineLink(chunks, '/privacy', 'register-kvkk-link'),
  });

  return (
    <>
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-acceptTerms"
            checked={value}
            onChange={() => onChange(!value)}
            label={termsLabel}
            error={errors.acceptTerms?.message}
          />
        )}
      />
      {errors.acceptTerms?.message ? (
        <Text variant="bodySm" tone="danger">{errors.acceptTerms.message}</Text>
      ) : null}

      <Controller
        control={control}
        name="acceptKvkk"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-acceptKvkk"
            checked={value}
            onChange={() => onChange(!value)}
            label={kvkkLabel}
            error={errors.acceptKvkk?.message}
          />
        )}
      />
      {errors.acceptKvkk?.message ? (
        <Text variant="bodySm" tone="danger">{errors.acceptKvkk.message}</Text>
      ) : null}

      <Controller
        control={control}
        name="acceptsMarketingEmails"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-acceptMarketing"
            checked={!!value}
            onChange={() => onChange(!value)}
            label={t('auth.marketingConsent')}
          />
        )}
      />
    </>
  );
}
