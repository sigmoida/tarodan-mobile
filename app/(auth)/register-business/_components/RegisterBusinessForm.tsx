import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Controller } from 'react-hook-form';
import { Button, Checkbox, Text, VStack, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { DEFAULT_COUNTRY_CODE, formatTrPhoneField, getPhonePlaceholder } from '@/utils/phone';
import { styles } from '../_lib/styles';
import type { RegisterBusinessController } from '../_hooks/useRegisterBusiness';

const { colors, spacing } = theme;

/** `formatTrPhoneField` baştaki `0`/`90`'ı soyduğu için placeholder da lokal biçim. */
const TR_PHONE_PLACEHOLDER = getPhonePlaceholder(DEFAULT_COUNTRY_CODE);

/** Kurumsal ön-başvuru form kartı — sekiz sözleşme alanı + KVKK onayı + gönder. */
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

  return (
    <View style={styles.card}>
      <VStack gap={3}>
        <View style={styles.infoCard}>
          <Ionicons name="business" size={24} color={colors.primary[600]!} />
          <Text variant="h3" align="center">İşletme olarak ön başvuru yapın</Text>
          <Text variant="bodySm" tone="muted" align="center">
            Başvurunuz admin onayına gönderilir. Onaylandığında kullanıcı adınızı ve
            şifrenizi belirleyeceğiniz bir davet e-postası alırsınız.
          </Text>
        </View>

        <Form form={form}>
          <Text variant="label" style={{ marginTop: spacing[2] }}>Yetkili Bilgileri</Text>
          <FormInput
            testID="register-business-authorizedFullName-input"
            name="authorizedFullName"
            label={t('auth.bizAuthorizedName')}
            placeholder={t('auth.bizAuthorizedNamePlaceholder')}
          />

          <Text variant="label" style={{ marginTop: spacing[2] }}>{t('auth.bizSectionCompany')}</Text>
          {/* İki alan da "Şirket…" ile başlayıp yan yana durunca ters doldurulmaya
              açıktı; ayrım artık etiket + helperText ile açık. */}
          <FormInput
            testID="register-business-companyLegalName-input"
            name="companyLegalName"
            label={t('auth.bizLegalName')}
            helperText={t('auth.bizLegalNameHelp')}
            placeholder={t('auth.bizLegalNamePlaceholder')}
          />
          <FormInput
            testID="register-business-companyTitle-input"
            name="companyTitle"
            label={t('auth.bizDisplayName')}
            helperText={t('auth.bizDisplayNameHelp')}
            placeholder={t('auth.bizDisplayNamePlaceholder')}
          />
          <FormInput
            testID="register-business-companyAddress-input"
            name="companyAddress"
            label={t('auth.bizAddress')}
            placeholder={t('auth.bizAddressPlaceholder')}
            multiline
            numberOfLines={3}
          />

          <Text variant="label" style={{ marginTop: spacing[2] }}>İletişim Bilgileri</Text>
          <FormInput
            testID="register-business-companyEmail-input"
            name="companyEmail"
            label={t('auth.bizEmail')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            testID="register-business-kepAddress-input"
            name="kepAddress"
            label="KEP Adresi (opsiyonel)"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {/* Telefon alanları her tuş vuruşunda formatlanır (eski formdaki `PhoneInput`
              davranışı, `FormInput`'un `transform` prop'u üzerinden — kendi kopyası
              yazılmadan): kullanıcı GÖNDERİLECEK değeri yazarken görür. */}
          <FormInput
            testID="register-business-phone-input"
            name="phone"
            label={t('auth.bizPhone')}
            placeholder={TR_PHONE_PLACEHOLDER}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            transform={formatTrPhoneField}
          />
          <FormInput
            testID="register-business-contactPhone-input"
            name="contactPhone"
            label={t('auth.bizContactPhone')}
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
              label={t('auth.bizTermsLabel')}
              error={errors.acceptTerms?.message}
            />
          )}
        />

        <Button
          testID="register-business-submit-button"
          variant="primary"
          size="lg"
          fullWidth
          title={t('auth.bizSubmit')}
          onPress={f.onSubmit}
          isLoading={busy}
          disabled={busy}
          style={{ marginTop: spacing[3] }}
        />
      </VStack>
    </View>
  );
}
