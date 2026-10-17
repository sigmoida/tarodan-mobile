import React from 'react';
import { useTranslation } from 'react-i18next';
import { useController, type UseFormReturn } from 'react-hook-form';
import { Form, FormInput } from '@/ui/form';
import { PhoneInput } from '@/components/common';
import { styles } from '../_lib/styles';
import type { GuestContactValues } from '../_lib/schema';

type GuestForm = UseFormReturn<GuestContactValues>;

/**
 * Misafir iletişim alanları. Değerler RHF formunda (`useCheckout` → `guestForm`); her alan kendi
 * Controller'ında render olur, böylece yazarken checkout controller'ı ve diğer bölümler yeniden
 * çizilmez. Doğrulama gönderimde `validateGuest` ile (bkz. `_lib/schema`).
 */
export const CheckoutGuestFields = React.memo(function CheckoutGuestFields({
  form,
}: {
  form: GuestForm;
}) {
  const { t } = useTranslation();
  return (
    <Form form={form}>
      <FormInput
        name="name"
        label={t('checkout.guestName')}
        required
        containerStyle={styles.field}
        testID="guest-name-input"
      />
      <FormInput
        name="email"
        label={t('checkout.guestEmail')}
        required
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.field}
        testID="guest-email-input"
      />
      <GuestPhoneField form={form} label={t('checkout.guestPhone')} />
    </Form>
  );
});

/** Telefon + ülke kodu iki ayrı form alanı; yalnız bu bileşen abone olur. */
function GuestPhoneField({ form, label }: { form: GuestForm; label: string }) {
  const phone = useController({ control: form.control, name: 'phone' });
  const countryCode = useController({ control: form.control, name: 'phoneCountryCode' });
  return (
    <PhoneInput
      testID="guest-phone-input"
      label={label}
      required
      // Çözülemeyen numara blur'da uyarır (gönderimi engelleyen kuralla aynı ayrıştırıcı).
      validateOnBlur
      countryCode={countryCode.field.value}
      onCountryCodeChange={countryCode.field.onChange}
      phone={phone.field.value}
      onPhoneChange={phone.field.onChange}
      containerStyle={styles.field}
    />
  );
}
