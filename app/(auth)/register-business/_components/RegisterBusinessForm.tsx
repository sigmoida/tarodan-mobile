import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Button, Checkbox, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PhonePrefix } from '@/components/auth/PhonePrefix';
import { useRichMessage } from '@/hooks/useRichMessage';
import { DEFAULT_COUNTRY_CODE, formatTrPhoneField, getPhonePlaceholder } from '@/utils/phone';
import { styles } from '../_lib/styles';
import type { RegisterBusinessController } from '../_hooks/useRegisterBusiness';

/** `formatTrPhoneField` baştaki `0`/`90`'ı soyduğu için placeholder lokal biçim (`+90` önek solda). */
const TR_PHONE_PLACEHOLDER = getPhonePlaceholder(DEFAULT_COUNTRY_CODE);

/** Metin içi bağlantı — onay kutusu etiketinin içinde (web `Link`). */
const inlineLink = (label: string, href: string) => (
  <Text
    variant="bodySm"
    tone="primary"
    weight="medium"
    accessibilityRole="link"
    onPress={() => router.push(href as never)}
  >
    {label}
  </Text>
);

/**
 * Kurumsal ön-başvuru formu (web `RegisterBusinessForm` sırası): Yetkili Ad Soyad, Şirket Tam
 * Adı, Şirket Ünvanı, Şirket Adresi (çok satırlı), Şirket E-posta, KEP, Telefon (+90),
 * (mobil-özel opsiyonel) Ek İletişim Telefonu, şartlar onayı, gönder. Bölüm başlığı / bilgi kartı yok — başlık üst barda.
 */
export function RegisterBusinessForm({ f }: { f: RegisterBusinessController }) {
  const { t } = useTranslation();
  const { form } = f;
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  // `handleSubmit` async: doğrulama sürerken mutation henüz `isPending` değil —
  // ikisi birden olmadan çift gönderim penceresi açık kalıyor.
  const busy = f.registerMutation.isPending || isSubmitting;

  const termsLabel = useRichMessage('auth.termsAgreeBusinessRich', {
    terms: (chunks) => inlineLink(chunks, '/terms'),
    privacy: (chunks) => inlineLink(chunks, '/privacy'),
  });

  return (
    <View style={styles.form}>
      <Form form={form}>
        <FormInput
          testID="register-business-authorizedFullName-input"
          name="authorizedFullName"
          label={t('auth.authorizedFullName')}
          required
          placeholder={t('auth.authorizedFullNamePlaceholder')}
          autoComplete="name"
        />
        <FormInput
          testID="register-business-companyLegalName-input"
          name="companyLegalName"
          label={t('auth.companyLegalName')}
          required
          placeholder={t('auth.companyLegalNamePlaceholder')}
        />
        <FormInput
          testID="register-business-companyTitle-input"
          name="companyTitle"
          label={t('auth.companyTitle')}
          required
          placeholder={t('auth.companyTitlePlaceholder')}
        />
        <FormInput
          testID="register-business-companyAddress-input"
          name="companyAddress"
          label={t('auth.companyAddress')}
          required
          placeholder={t('auth.companyAddressPlaceholder')}
          multiline
          numberOfLines={3}
        />
        <FormInput
          testID="register-business-companyEmail-input"
          name="companyEmail"
          label={t('auth.companyEmail')}
          required
          placeholder={t('auth.companyEmailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormInput
          testID="register-business-kepAddress-input"
          name="kepAddress"
          label={t('auth.kepAddress')}
          required
          placeholder={t('auth.kepAddressPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {/* Telefon her tuş vuruşunda formatlanır (`FormInput`'un `transform` prop'u): kullanıcı
            GÖNDERİLECEK değeri yazarken görür. Solda sabit `+90` (TR dışı numara kabul edilmez). */}
        <FormInput
          testID="register-business-phone-input"
          name="phone"
          label={t('auth.companyPhone')}
          required
          leftIcon={<PhonePrefix />}
          placeholder={TR_PHONE_PLACEHOLDER}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          transform={formatTrPhoneField}
        />
        {/* Mobilde var, web'de yok: API `contactPhone` opsiyonel alanı (boşsa hiç gönderilmez). */}
        <FormInput
          testID="register-business-contactPhone-input"
          name="contactPhone"
          label={t('auth.bizContactPhone')}
          leftIcon={<PhonePrefix />}
          placeholder={TR_PHONE_PLACEHOLDER}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          transform={formatTrPhoneField}
        />
      </Form>

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-business-acceptTerms"
            checked={!!value}
            onChange={() => onChange(!value)}
            label={termsLabel}
            error={errors.acceptTerms?.message}
          />
        )}
      />
      {errors.acceptTerms?.message ? (
        <Text variant="bodySm" tone="danger">{errors.acceptTerms.message}</Text>
      ) : null}

      <Button
        testID="register-business-submit-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.submitCorporateApplication')}
        onPress={f.onSubmit}
        isLoading={busy}
        disabled={busy}
        style={styles.submit}
      />
    </View>
  );
}
