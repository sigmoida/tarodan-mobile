import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Alert, Radio, SectionCard, Text } from '@/ui';
import { AddressSelector } from './AddressSelector';
import { CheckoutGuestFields } from './CheckoutGuestFields';
import { styles } from '../_lib/styles';
import type { useCheckout } from '../_hooks/useCheckout';

type Ctrl = ReturnType<typeof useCheckout>;
type Props = Pick<
  Ctrl,
  | 'isAuthenticated'
  | 'guestForm'
  | 'addresses'
  | 'selectedAddressId'
  | 'setSelectedAddressId'
  | 'shippingAddress'
  | 'setShippingAddress'
  | 'billingDifferent'
  | 'setBillingDifferent'
  | 'selectedBillingAddressId'
  | 'setSelectedBillingAddressId'
  | 'billingAddress'
  | 'setBillingAddress'
>;

/**
 * Teslimat adresi + fatura adresi (web `AddressStep`). Misafirde iletişim alanları aynı kartın
 * içinde, adresin üstünde. State/doğrulama `useCheckout`'ta; burası yalnız sunum.
 *
 * Misafir alanları RHF'de (`CheckoutGuestFields`) — yazarken yalnız o alan render olur. Kart
 * `React.memo`: kupon/özet değişimi adres formunu yeniden çizmez.
 */
export const CheckoutAddressSection = React.memo(function CheckoutAddressSection(c: Props) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.shippingAddress')} testID="checkout-address">
      {!c.isAuthenticated ? (
        <View>
          <Alert variant="warning" style={styles.field}>
            {t('checkout.guestShoppingNotice')}
          </Alert>
          <CheckoutGuestFields form={c.guestForm} />
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
});
