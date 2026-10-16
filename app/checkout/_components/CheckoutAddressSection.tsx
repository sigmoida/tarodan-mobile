import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Alert, Radio, SectionCard, Text } from '@/ui';
import { AddressSelector } from './AddressSelector';
import { useAddressValue } from '../_hooks/useAddressValue';
import type { AddressStore } from '../_lib/addressStore';
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
  | 'shippingAddressStore'
  | 'billingDifferent'
  | 'setBillingDifferent'
  | 'selectedBillingAddressId'
  | 'setSelectedBillingAddressId'
  | 'billingAddressStore'
>;

/**
 * Adres seçici + inline form; değeri adres deposundan okur (`useAddressValue`). Tuş vuruşu
 * YALNIZ bunu yeniden çizer — kart ve `useCheckout` controller'ı çalışmaz.
 */
function StoreAddressSelector({
  store,
  ...rest
}: Omit<React.ComponentProps<typeof AddressSelector>, 'inline' | 'setInline'> & { store: AddressStore }) {
  const inline = useAddressValue(store);
  return <AddressSelector {...rest} inline={inline} setInline={store.set} />;
}

/**
 * Teslimat adresi + fatura adresi (web `AddressStep`). Misafirde iletişim alanları aynı kartın
 * içinde, adresin üstünde. Doğrulama `useCheckout`'ta; inline adres değeri depoda (`addressStore`).
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

      <StoreAddressSelector
        isAuthenticated={c.isAuthenticated}
        addresses={c.addresses}
        selectedId={c.selectedAddressId}
        setSelectedId={c.setSelectedAddressId}
        store={c.shippingAddressStore}
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
            <StoreAddressSelector
              isBilling
              isAuthenticated={c.isAuthenticated}
              addresses={c.addresses}
              selectedId={c.selectedBillingAddressId}
              setSelectedId={c.setSelectedBillingAddressId}
              store={c.billingAddressStore}
            />
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
});
