import React from 'react';
import { ScrollView } from 'react-native';
import { Checkbox, Modal, ModalFooter, Input, ModalMessage } from '@/ui';

import { CityDistrictSelector, PhoneInput } from '@/components/common';
import { styles } from '../_lib/styles';
import type { AddressesController } from '../_hooks/useAddresses';

/** Add/edit address dialog with per-field validation. */
export function AddressFormModal({ f }: { f: AddressesController }) {
  const { t, formData, setFormData, fieldErrors, clearFieldError } = f;
  return (
    <Modal
      isOpen={f.dialogVisible}
      onClose={() => f.setDialogVisible(false)}
      title={f.editingAddress ? t('address.editAddress') : t('address.newAddress')}
      scrollable={false}
      footer={
        <ModalFooter
          onCancel={() => f.setDialogVisible(false)}
          onConfirm={f.handleSubmit}
          cancelLabel={t('mobile.cancel')}
          confirmLabel={t('mobile.save')}
          disabled={f.saveMutation.isPending}
          confirmTestID="address-save-button"
        />
      }
    >
      <ScrollView style={styles.dialogScroll}>
        <Input
          testID="address-title-input"
          label={`${t('address.addressTitleLabel')} *`}
          value={formData.title}
          onChangeText={(text) => {
            setFormData({ ...formData, title: text });
            clearFieldError('title');
          }}
          error={fieldErrors.title}
          placeholder={t('mobile.addressTitlePlaceholder')}
          containerStyle={styles.input}
        />
        <Input
          testID="address-fullname-input"
          label={`${t('address.fullName')} *`}
          value={formData.fullName}
          onChangeText={(text) => {
            setFormData({ ...formData, fullName: text });
            clearFieldError('fullName');
          }}
          error={fieldErrors.fullName}
          containerStyle={styles.input}
        />
        <PhoneInput
          testID="address-phone-input"
          label={`${t('address.phone')} *`}
          // Kaydete basmadan önce görsün: çözülemeyen numara blur'da uyarır.
          validateOnBlur
          countryCode={formData.phoneCountryCode}
          onCountryCodeChange={(code) => setFormData({ ...formData, phoneCountryCode: code })}
          phone={formData.phone}
          onPhoneChange={(phone) => {
            setFormData({ ...formData, phone });
            clearFieldError('phone');
          }}
          error={fieldErrors.phone}
          containerStyle={styles.input}
        />
        <Input
          testID="address-address-input"
          label={`${t('address.address')} *`}
          value={formData.address}
          onChangeText={(text) => {
            setFormData({ ...formData, address: text });
            clearFieldError('address');
          }}
          error={fieldErrors.address}
          multiline
          numberOfLines={2}
          containerStyle={styles.input}
        />
        <CityDistrictSelector
          city={formData.city}
          district={formData.district}
          cityError={!!fieldErrors.city}
          districtError={!!fieldErrors.district}
          // Fonksiyonel güncelleme şart: il seçilince selector aynı anda
          // onChangeCity + onChangeDistrict('') çağırır; stale obje ile
          // yazılırsa ikinci çağrı ilk yazılan şehri ezer.
          onChangeCity={(city) => {
            setFormData((prev) => ({ ...prev, city }));
            clearFieldError('city');
          }}
          onChangeDistrict={(district) => {
            setFormData((prev) => ({ ...prev, district }));
            clearFieldError('district');
          }}
        />
        <Input
          label={t('address.zipCode')}
          value={formData.postalCode}
          onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
          keyboardType="numeric"
          containerStyle={styles.input}
        />
        <Checkbox
          checked={formData.isDefault}
          onChange={(isDefault) => setFormData({ ...formData, isDefault })}
          label={t('mobile.setAsDefault')}
        />
      </ScrollView>
      <ModalMessage state={f.formMsg.state} />
    </Modal>
  );
}
