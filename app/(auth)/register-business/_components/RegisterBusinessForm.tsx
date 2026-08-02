import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Controller } from 'react-hook-form';
import { Button, Checkbox, Text, VStack, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { styles } from '../_lib/styles';
import type { RegisterBusinessController } from '../_hooks/useRegisterBusiness';

const { colors, spacing } = theme;

/** Kurumsal ön-başvuru form kartı — sekiz sözleşme alanı + KVKK onayı + gönder. */
export function RegisterBusinessForm({ f }: { f: RegisterBusinessController }) {
  const { form } = f;
  const {
    control,
    formState: { errors },
  } = form;

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
          <FormInput
            testID="register-business-companyLegalName-input"
            name="companyLegalName"
            label="Şirket Ticaret Unvanı *"
            placeholder="Ör. Örnek Otomotiv Sanayi ve Ticaret Ltd. Şti."
          />
          <FormInput
            testID="register-business-companyTitle-input"
            name="companyTitle"
            label="Şirket Adı / Marka *"
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
          <FormInput
            testID="register-business-phone-input"
            name="phone"
            label="Telefon *"
            placeholder="05XX XXX XX XX"
            keyboardType="phone-pad"
          />
          <FormInput
            testID="register-business-contactPhone-input"
            name="contactPhone"
            label="Ek İletişim Telefonu (opsiyonel)"
            placeholder="05XX XXX XX XX"
            keyboardType="phone-pad"
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
          isLoading={f.registerMutation.isPending}
          disabled={f.registerMutation.isPending}
          style={{ marginTop: spacing[3] }}
        />
      </VStack>
    </View>
  );
}
