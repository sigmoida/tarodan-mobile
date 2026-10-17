import React from 'react';
import { Controller } from 'react-hook-form';
import { Button, Checkbox, SectionCard } from '@/ui';
import { Form, FormError, FormInput } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { CityDistrictSelector, PhoneInput } from '@/components/common';
import { ADDRESS_LIMITS } from '../_lib/schema';
import { styles } from '../_lib/styles';
import type { Address } from '../_lib/types';
import { useAddressForm } from '../_hooks/useAddressForm';

/**
 * Yeni / düzenle adres EKRANI gövdesi (iki rota da bunu kompoze eder): PageShell
 * (klavye kaçınma + sabit alt çubuk) + tek SectionCard içinde alanlar. Kaydet alt
 * çubukta, klavyenin üstünde; hatalı alanların ADLARI + sunucu hatası (`FormError`) hemen
 * üstünde, ayrıntı her alanın (il/ilçe dahil) altında.
 * Form/mutasyon `useAddressForm`'da.
 */
export function AddressForm({ address }: { address: Address | null }) {
  const { t, form, save, setField, onSubmit, isEdit } = useAddressForm(address);
  const [city, district, isDefault] = form.watch(['city', 'district', 'isDefault']);
  const errors = form.formState.errors;

  return (
    <Form form={form}>
      <PageShell
        title={isEdit ? t('address.editAddress') : t('address.newAddress')}
        footer={
          <>
            <FormError />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              title={t('mobile.save')}
              onPress={onSubmit}
              isLoading={save.isPending}
              disabled={save.isPending}
              testID="address-save-button"
            />
          </>
        }
      >
        <SectionCard>
          <FormInput
            name="title"
            testID="address-title-input"
            label={`${t('address.addressTitleLabel')} *`}
            placeholder={t('mobile.addressTitlePlaceholder')}
            maxLength={ADDRESS_LIMITS.titleMax}
            containerStyle={styles.input}
          />
          <FormInput
            name="fullName"
            testID="address-fullname-input"
            label={`${t('address.fullName')} *`}
            maxLength={ADDRESS_LIMITS.fullNameMax}
            containerStyle={styles.input}
          />
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <PhoneInput
                testID="address-phone-input"
                label={t('address.phone')}
                required
                // Kaydete basmadan önce görsün: çözülemeyen numara blur'da uyarır.
                validateOnBlur
                phone={field.value}
                onPhoneChange={field.onChange}
                error={fieldState.error?.message}
                containerStyle={styles.input}
              />
            )}
          />
          <FormInput
            name="address"
            testID="address-address-input"
            label={`${t('address.address')} *`}
            multiline
            numberOfLines={2}
            maxLength={ADDRESS_LIMITS.addressMax}
            containerStyle={styles.input}
          />
          <CityDistrictSelector
            city={city}
            district={district}
            cityError={errors.city?.message}
            districtError={errors.district?.message}
            onChangeCity={(next) => setField('city', next)}
            onChangeDistrict={(next) => setField('district', next)}
          />
          <FormInput
            name="postalCode"
            testID="address-zip-input"
            label={t('address.zipCode')}
            keyboardType="numeric"
            maxLength={ADDRESS_LIMITS.zipCodeMax}
            containerStyle={styles.input}
          />
          <Checkbox
            checked={isDefault}
            onChange={(next) => setField('isDefault', next)}
            label={t('mobile.setAsDefault')}
          />
        </SectionCard>
      </PageShell>
    </Form>
  );
}
