import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Alert, Input, Radio, SectionCard, Text } from '@/ui';
import { PhoneInput } from '@/components/common';
import { AddressSelector } from './AddressSelector';
import { styles } from '../_lib/styles';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;

/**
 * Teslimat adresi + fatura adresi (web `AddressStep`). Misafirde iletişim alanları aynı kartın
 * içinde, adresin üstünde. State/doğrulama `useCheckout`'ta; burası yalnız sunum.
 */
export function CheckoutAddressSection({ c }: { c: Ctrl }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.shippingAddress')} testID="checkout-address">
      {!c.isAuthenticated ? (
        <View>
          <Alert variant="warning" style={styles.field}>
            {t('checkout.guestShoppingNotice')}
          </Alert>
          <Input
            label={t('checkout.guestName')}
            required
            value={c.guestName}
            onChangeText={c.setGuestName}
            containerStyle={styles.field}
            testID="guest-name-input"
          />
          <Input
            label={t('checkout.guestEmail')}
            required
            value={c.guestEmail}
            onChangeText={c.setGuestEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.field}
            testID="guest-email-input"
          />
          <PhoneInput
            testID="guest-phone-input"
            label={t('checkout.guestPhone')}
            required
            // Çözülemeyen numara blur'da uyarır (gönderimi engelleyen kuralla aynı ayrıştırıcı).
            validateOnBlur
            countryCode={c.guestPhoneCountryCode}
            onCountryCodeChange={c.setGuestPhoneCountryCode}
            phone={c.guestPhone}
            onPhoneChange={c.setGuestPhone}
            containerStyle={styles.field}
          />
          <View style={styles.guestDivider} />
        </View>
      ) : null}

      <AddressSelector
        isAuthenticated={c.isAuthenticated}
        addresses={c.addresses}
        selectedId={c.selectedAddressId}
        setSelectedId={c.setSelectedAddressId}
        inline={c.shippingAddress}
        setInline={c.setShippingAddress}
      />

      {!c.isAuthenticated ? (
        <Pressable
          style={styles.link}
          accessibilityRole="link"
          hitSlop={12}
          onPress={() => router.push('/(auth)/login' as any)}
        >
          <Text variant="bodySm" tone="primary">{t('checkout.alreadyMember')}</Text>
        </Pressable>
      ) : null}

      {/* Fatura adresi: teslimatla aynı ya da farklı (web iki Radio). */}
      <View style={styles.billing}>
        <Text variant="body" weight="semibold" tone="heading">{t('checkout.billingAddress')}</Text>
        <Radio
          checked={!c.billingDifferent}
          onChange={() => c.setBillingDifferent(false)}
          label={t('checkout.billingSameAsShippingLabel')}
        />
        <Radio
          checked={c.billingDifferent}
          onChange={() => c.setBillingDifferent(true)}
          label={t('checkout.differentBilling')}
        />
        {c.billingDifferent ? (
          <View style={styles.billingForm}>
            <Text variant="bodySm" tone="muted" style={styles.field}>{t('checkout.enterBillingAddress')}</Text>
            <AddressSelector
              isBilling
              isAuthenticated={c.isAuthenticated}
              addresses={c.addresses}
              selectedId={c.selectedBillingAddressId}
              setSelectedId={c.setSelectedBillingAddressId}
              inline={c.billingAddress}
              setInline={c.setBillingAddress}
            />
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}
