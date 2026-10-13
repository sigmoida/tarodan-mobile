import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Radio, Text, theme } from '@/ui';
import { CityDistrictSelector, PhoneInput } from '@/components/common';
import { DEFAULT_COUNTRY_CODE } from '@/utils/phone';
import { styles } from '../_lib/styles';
import type { ShippingAddressInput, SavedAddress } from '../_lib/types';

/**
 * Teslimat / fatura adresi seçici — web `AddressStep`: kayıtlı adresler 2px kenarlıklı kartlar
 * (seçili: primary-500 kenarlık + primary-50 zemin), "Yeni Adres Ekle" ayrı kart, altında satır
 * içi form. Seçim/state mantığı değişmedi (`selectedId === 'new'` = satır içi form).
 */
export function AddressSelector({
  isBilling = false,
  isAuthenticated,
  addresses,
  selectedId,
  setSelectedId,
  inline,
  setInline,
}: {
  isBilling?: boolean;
  isAuthenticated: boolean;
  addresses: SavedAddress[];
  selectedId: string | 'new';
  setSelectedId: (id: string | 'new') => void;
  inline: ShippingAddressInput;
  setInline: React.Dispatch<React.SetStateAction<ShippingAddressInput>>;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {isAuthenticated && addresses.length > 0 ? (
        <View style={[styles.stack, styles.field]}>
          {addresses.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedId === a.id }}
              style={[styles.addressCard, selectedId === a.id && styles.addressCardActive]}
              onPress={() => setSelectedId(a.id)}
            >
              <Radio checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} />
              <View style={styles.addressCardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="body" weight="semibold" tone="heading">{a.title || a.fullName}</Text>
                  {a.isDefault ? <Text variant="bodySm" tone="muted"> · {t('common.default')}</Text> : null}
                </View>
                <Text variant="bodySm" tone="muted" numberOfLines={2}>{a.fullName} · {a.phone}</Text>
                <Text variant="bodySm" tone="muted" numberOfLines={2}>{a.address}, {a.district}/{a.city}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedId === 'new' }}
            style={[styles.addressCard, selectedId === 'new' && styles.addressCardActive]}
            onPress={() => setSelectedId('new')}
          >
            <Radio checked={selectedId === 'new'} onChange={() => setSelectedId('new')} />
            <View style={[styles.addressCardBody, { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }]}>
              <Ionicons name="add" size={theme.iconSize.lg} color={theme.colors.text.muted} />
              <Text variant="body" weight="semibold" tone="heading">{t('checkout.addNewAddress')}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {selectedId === 'new' ? (
        <View style={styles.addressForm}>
          <Input
            label={t('checkout.fullNameRequired')}
            value={inline.fullName}
            onChangeText={(text: string) => setInline({ ...inline, fullName: text })}
            containerStyle={styles.field}
            testID={isBilling ? undefined : 'shipping-fullname-input'}
          />
          <PhoneInput
            testID={isBilling ? 'billing-phone-input' : 'shipping-phone-input'}
            label={t('auth.bizPhone')}
            // Ödeme adımına gelmeden görsün: çözülemeyen numara blur'da uyarır.
            // Gönderimi engelleyen kuralla AYNI ayrıştırıcı (`@/utils/phone`).
            validateOnBlur
            countryCode={inline.phoneCountryCode ?? DEFAULT_COUNTRY_CODE}
            onCountryCodeChange={(code) => setInline((prev) => ({ ...prev, phoneCountryCode: code }))}
            phone={inline.phone}
            onPhoneChange={(phone) => setInline((prev) => ({ ...prev, phone }))}
            containerStyle={styles.field}
          />
          <CityDistrictSelector
            city={inline.city}
            district={inline.district}
            onChangeCity={(city) => setInline((prev) => ({ ...prev, city }))}
            onChangeDistrict={(district) => setInline((prev) => ({ ...prev, district }))}
          />
          <Input
            label={t('checkout.streetAddressRequired')}
            value={inline.address}
            onChangeText={(text: string) => setInline({ ...inline, address: text })}
            multiline
            numberOfLines={3}
            containerStyle={styles.field}
            testID={isBilling ? undefined : 'shipping-address-input'}
          />
          <Input
            label={t('checkout.zipCode')}
            value={inline.zipCode || ''}
            onChangeText={(text: string) => setInline({ ...inline, zipCode: text })}
            keyboardType="number-pad"
            maxLength={5}
            containerStyle={styles.field}
          />
        </View>
      ) : null}
    </View>
  );
}
