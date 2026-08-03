import { View } from 'react-native';
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
            label="Yetkili Ad Soyad *"
            placeholder="Ör. Ayşe Yılmaz"
          />

          <Text variant="label" style={{ marginTop: spacing[2] }}>Şirket Bilgileri</Text>
          {/* İki alan da "Şirket…" ile başlayıp yan yana durunca ters doldurulmaya
              açıktı; ayrım artık etiket + helperText ile açık. */}
          <FormInput
            testID="register-business-companyLegalName-input"
            name="companyLegalName"
            label="Ticaret Unvanı *"
            helperText="Vergi levhanızda yazan tam unvan."
            placeholder="Ör. Örnek Otomotiv Sanayi ve Ticaret Ltd. Şti."
          />
          <FormInput
            testID="register-business-companyTitle-input"
            name="companyTitle"
            label="Görünen İşletme Adı *"
            helperText="Tarodan'da alıcılara gösterilecek kısa ad/marka."
            placeholder="Ör. Örnek Otomotiv"
          />
          <FormInput
            testID="register-business-companyAddress-input"
            name="companyAddress"
            label="Şirket Adresi *"
            placeholder="Mahalle, cadde/sokak, no, ilçe/il"
            multiline
            numberOfLines={3}
          />

          <Text variant="label" style={{ marginTop: spacing[2] }}>İletişim Bilgileri</Text>
          <FormInput
            testID="register-business-companyEmail-input"
            name="companyEmail"
            label="Şirket E-posta *"
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
            label="Telefon *"
            placeholder={TR_PHONE_PLACEHOLDER}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            transform={formatTrPhoneField}
          />
          <FormInput
            testID="register-business-contactPhone-input"
            name="contactPhone"
            label="Ek İletişim Telefonu (opsiyonel)"
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
              label="Üyelik sözleşmesini ve KVKK aydınlatma metnini okudum, kabul ediyorum. *"
              error={errors.acceptTerms?.message}
            />
          )}
        />

        <Button
          testID="register-business-submit-button"
          variant="primary"
          size="lg"
          fullWidth
          title="Başvuru Gönder"
          onPress={f.onSubmit}
          isLoading={busy}
          disabled={busy}
          style={{ marginTop: spacing[3] }}
        />
      </VStack>
    </View>
  );
}
