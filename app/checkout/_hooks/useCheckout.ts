import { useState, useEffect, useMemo, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { appAlert, alertAfterClose } from '@/ui';
import { ordersApi, paymentsApi, addressesApi, cartApi, type OrderAddressInput, type OrderQuoteResponse } from '@/lib/api';
import { qk } from '@/lib/query';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { captureException } from '@/services/sentry';
import { formatPrice } from '@/utils/format';
import { DEFAULT_COUNTRY_CODE, normalizePhoneForPayload } from '@/utils/phone';
import { STOCKOUT_KEYWORDS, generateUuidV4, EMPTY_ADDRESS } from '../_lib/constants';
import { extractApiMessage, validateGuest, validateInlineAddress } from '../_lib/validation';
import { useCoupon } from './useCoupon';
import type { ShippingAddressInput, SavedAddress } from '../_lib/types';

/**
 * Checkout controller'ı — tüm form durumu, query'ler, kargo hesabı, payload
 * kurucuları ve ödeme akışı (`proceedCheckout` + misafir OTP) burada. Ekran
 * yalnız adımları kompoze eder. Ödeme dallanmaları orijinalden BİREBİR taşındı.
 */
export function useCheckout() {
  const { buyNow } = useLocalSearchParams<{ buyNow?: string }>();
  const isBuyNow = buyNow === '1';
  const { items: cartItems, clearCart: clearCartStore, buyNowItem, clearBuyNow } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const items = useMemo(
    () => (isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cartItems),
    [isBuyNow, buyNowItem, cartItems],
  );
  const finalizeCart = () => {
    if (isBuyNow) {
      clearBuyNow();
      return;
    }
    clearCartStore();
    // Üyede sunucu sepeti de boşaltılır; yoksa satın alınan satırlar orada kalır.
    if (isAuthenticated) {
      cartApi.clear().catch((error) =>
        captureException(error, { level: 'warning', tags: { flow: 'checkout.clearServerCart' } }),
      );
    }
  };

  const [step, setStep] = useState(1);

  const idempotencyKeyRef = useRef(generateUuidV4());
  useEffect(() => {
    idempotencyKeyRef.current = generateUuidV4();
  }, [items]);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPhoneCountryCode, setGuestPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);

  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressInput>(EMPTY_ADDRESS);
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | 'new'>('new');
  const [billingAddress, setBillingAddress] = useState<ShippingAddressInput>(EMPTY_ADDRESS);

  const paymentProvider = 'paytr' as const;

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.price * it.quantity, 0), [items]);

  // Kupon: `/discounts/validate` ile doğrulanır. Doğrulanmış kod quote'a da
  // gönderilir (aşağıda) — sunucu `summary.productAmount`'ı "kupon sonrası ara
  // toplam" olarak tanımlıyor; kod gitmezse bu alan indirimsiz kalır ve
  // `summary.total` checkout'ta gerçekte tahsil edilenden FAZLA görünür.
  const coupon = useCoupon(items, isAuthenticated);

  // Quote'un KÖKÜ korunur — `pricingHash` + `shippingTariffVersion` kökte,
  // `pricing` içinde DEĞİL, ve order-create payload'larına aynen geri gider.
  // `couponCode` queryKey'e DAHİL: kupon uygulanınca/kaldırılınca quote tazelenir.
  const quoteQuery = useQuery({
    queryKey: qk.checkout.quote(
      items.map((it) => `${it.productId}:${it.quantity}`).join(','),
      coupon.couponCode,
    ),
    queryFn: async () => {
      const baseItems = items.map((it) => ({ productId: it.productId, quantity: it.quantity }));
      const couponCode = coupon.couponCode;
      try {
        const res = await ordersApi.getQuote({
          items: baseItems,
          ...(couponCode ? { couponCode } : {}),
        });
        return (res.data ?? {}) as OrderQuoteResponse;
      } catch (err: any) {
        // Kupon arada geçersizleşmiş olabilir (süre doldu / kullanım limiti) —
        // yapısal hata kodu yok, yalnız `message` string'i var (canlı ölçüm: 400
        // "Kupon kodu bulunamadı"). Checkout'u kilitleme: kuponu düşür, kuponsuz
        // quote'u aynı istekte tekrar dene, kullanıcıya haber ver.
        if (couponCode && err?.response?.status === 400) {
          coupon.remove();
          alertRespectingOtpModal(
            'Kupon Geçersiz',
            extractApiMessage(err) ?? 'Kupon kodu artık geçerli değil, kaldırıldı.',
          );
          const retryRes = await ordersApi.getQuote({ items: baseItems });
          return (retryRes.data ?? {}) as OrderQuoteResponse;
        }
        throw err;
      }
    },
    enabled: items.length > 0,
    staleTime: 60_000,
  });
  const quote = quoteQuery.data;
  const summary = quote?.pricing?.summary;
  // Kargo yalnızca quote'tan gelir — GET /shipping/rates çağrısı ve başarısızlıkta
  // 34.9/49.9 sabitine düşen fallback kaldırıldı: ağ hatasında ekrandaki tutarın
  // PayTR'de çekilen tutardan sessizce ayrışmasına yol açıyordu.
  const shippingCost = Number(summary?.shippingAmount ?? 0);
  const shippingLoading = quoteQuery.isLoading;
  // Kupon sonrası ürün ara toplamı — quote yüklenene kadar yerel toplamla
  // (aynı, henüz hesap yapılmamış rakam) doldurulur, sonrasında sunucu değeri geçerli.
  const productAmount = Number(summary?.productAmount ?? subtotal);
  // Hizmet bedeli + TÜM alıcı hizmet KDV'si — ayrı bir KDV satırı basılmaz.
  const serviceFeeAmount = Number(summary?.serviceFeeAmount ?? 0);
  // Toplam SUNUCU garantisi — yerel aritmetik yok, `pricing.summary.total` aynen
  // basılır. Kupon doğrulanmışsa quote'a gittiği için bu değer zaten indirimlidir.
  const total = Number(summary?.total ?? 0);

  const addressesQuery = useQuery({
    queryKey: qk.addresses.mine,
    queryFn: async () => {
      const response = await addressesApi.getAll();
      const list: SavedAddress[] = (response.data as any)?.data ?? response.data ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: isAuthenticated,
  });
  const addresses = addressesQuery.data ?? [];

  useEffect(() => {
    if (!isAuthenticated || addresses.length === 0) return;
    if (selectedAddressId !== 'new') return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, addresses]);

  useEffect(() => {
    if (!otpModalOpen) return;
    const id = setInterval(() => setOtpExpiresIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [otpModalOpen]);

  const effectiveShippingCity = useMemo(() => {
    if (isAuthenticated && selectedAddressId !== 'new') {
      const a = addresses.find((x) => x.id === selectedAddressId);
      return a?.city ?? '';
    }
    return shippingAddress.city;
  }, [isAuthenticated, selectedAddressId, addresses, shippingAddress.city]);

  const showSnackbar = (message: string) => setSnackbar({ visible: true, message });

  /** Modal açıkken appAlert çağırmak iOS'ta donuyor — OTP modalı açıksa önce
   *  kapat, sonra göster (aksi halde doğrudan göster). */
  const alertRespectingOtpModal = (title: string, message?: string) => {
    if (otpModalOpen) {
      alertAfterClose(closeOtpModal, title, message);
    } else {
      appAlert(title, message);
    }
  };

  const handleEmailAlreadyRegistered = (e: any): boolean => {
    if (e?.response?.status === 409 || e?.response?.data?.code === 'EMAIL_ALREADY_REGISTERED') {
      appAlert(
        'Bu e-posta zaten kayıtlı',
        extractApiMessage(e) ?? 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapıp alışverişe devam edin.',
      );
      router.push('/(auth)/login' as any);
      return true;
    }
    return false;
  };

  const validateStep1 = (): string | null => {
    if (!isAuthenticated) {
      const guestErr = validateGuest(guestName, guestEmail, guestPhone);
      if (guestErr) return guestErr;
    }
    if (isAuthenticated && selectedAddressId !== 'new') {
      // Kayıtlı adres seçildi → OK
    } else {
      const phone = shippingAddress.phone.trim() || guestPhone.trim();
      const err = validateInlineAddress({ ...shippingAddress, phone });
      if (err) return err;
    }
    if (billingDifferent) {
      if (isAuthenticated && selectedBillingAddressId !== 'new') {
        // Kayıtlı seçildi → OK
      } else {
        const err = validateInlineAddress(billingAddress, 'Fatura');
        if (err) return err;
      }
    }
    return null;
  };

  const handleNextStep = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) return showSnackbar(err);
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };

  const buildShippingPayload = (): { id?: string; inline?: OrderAddressInput } => {
    if (isAuthenticated && selectedAddressId !== 'new') {
      return { id: selectedAddressId };
    }
    const phone = shippingAddress.phone.trim()
      ? normalizePhoneForPayload(shippingAddress.phone, shippingAddress.phoneCountryCode ?? DEFAULT_COUNTRY_CODE)
      : normalizePhoneForPayload(guestPhone, guestPhoneCountryCode);
    return {
      inline: {
        fullName: shippingAddress.fullName.trim(),
        phone,
        city: shippingAddress.city.trim(),
        district: shippingAddress.district.trim(),
        address: shippingAddress.address.trim(),
        zipCode: shippingAddress.zipCode?.trim() || undefined,
      },
    };
  };

  const buildBillingPayload = (): { id?: string; inline?: OrderAddressInput } | null => {
    if (!billingDifferent) return null;
    if (isAuthenticated && selectedBillingAddressId !== 'new') {
      return { id: selectedBillingAddressId };
    }
    return {
      inline: {
        fullName: billingAddress.fullName.trim(),
        phone: normalizePhoneForPayload(billingAddress.phone, billingAddress.phoneCountryCode ?? DEFAULT_COUNTRY_CODE),
        city: billingAddress.city.trim(),
        district: billingAddress.district.trim(),
        address: billingAddress.address.trim(),
        zipCode: billingAddress.zipCode?.trim() || undefined,
      },
    };
  };

  const proceedCheckout = async (emailVerificationCode?: string) => {
    if (loading) return;
    // API DTO'sunda ikisi de zorunlu — quote yüklenmeden HER ZAMAN göndermek
    // yerine burada durup kullanıcıdan bekle (undefined/0 göndermek yalnızca
    // aynı 400'ü başka bir şekilde üretir).
    if (!quote?.pricingHash || quote.shippingTariffVersion == null) {
      alertRespectingOtpModal(
        'Fiyat Bilgisi Hazır Değil',
        'Fiyat bilgisi yükleniyor, lütfen birkaç saniye sonra tekrar deneyin.',
      );
      return;
    }
    setLoading(true);
    try {
      const shipping = buildShippingPayload();
      const billing = buildBillingPayload();

      const checkoutPayload = {
        items: items.map((item) => ({ productId: item.productId })),
        idempotencyKey: idempotencyKeyRef.current,
        shippingAddressId: shipping.id,
        shippingAddress: shipping.inline,
        billingAddressId: billing?.id,
        billingAddress: billing?.inline,
        // Quote kökünden AYNEN — API DTO'sunda ikisi de zorunlu, koşullu gönderilmez.
        expectedPricingHash: quote.pricingHash,
        expectedShippingTariffVersion: quote.shippingTariffVersion,
        // Kupon yoksa alanı hiç göndermiyoruz (backend opsiyonel bekliyor).
        ...(coupon.couponCode ? { couponCode: coupon.couponCode } : {}),
      };

      const response =
        isAuthenticated && user
          ? await ordersApi.checkout(checkoutPayload)
          : await ordersApi.checkoutGuest({
              items: checkoutPayload.items,
              idempotencyKey: checkoutPayload.idempotencyKey,
              email: guestEmail.trim().toLowerCase(),
              emailVerificationCode: emailVerificationCode ?? '',
              phone: normalizePhoneForPayload(guestPhone, guestPhoneCountryCode),
              guestName: guestName.trim(),
              shippingAddress: shipping.inline!,
              billingAddress: billing?.inline,
              expectedPricingHash: checkoutPayload.expectedPricingHash,
              expectedShippingTariffVersion: checkoutPayload.expectedShippingTariffVersion,
              ...(coupon.couponCode ? { couponCode: coupon.couponCode } : {}),
            });

      const data: any = (response.data as any)?.data ?? response.data;
      const checkoutGroupId: string | null = data?.checkoutGroupId ?? null;
      const firstOrderId: string | null = data?.orders?.[0]?.orderId ?? null;

      if (!checkoutGroupId || !firstOrderId) {
        appAlert(
          'Hata',
          'Sipariş oluşturuldu fakat ödeme başlatılamadı. Siparişlerim sayfasından devam edebilirsiniz.',
        );
        finalizeCart();
        router.replace('/orders' as any);
        return;
      }

      try {
        const initResp: any = isAuthenticated
          ? await paymentsApi.initiateGroup(checkoutGroupId, paymentProvider)
          : await paymentsApi.initiateGroupGuest(checkoutGroupId, paymentProvider);
        const initData = initResp.data?.data ?? initResp.data ?? {};
        const paymentId = initData.paymentId || initData.id || initData.payment?.id || firstOrderId;

        if (initData.useBypass === true) {
          try {
            await paymentsApi.bypassComplete(paymentId);
          } catch (bypassErr: any) {
            captureException(bypassErr, {
              level: 'error',
              tags: { flow: 'checkout.bypassComplete' },
              extra: { paymentId, orderId: firstOrderId, checkoutGroupId },
            });
          }
          finalizeCart();
          router.replace({
            pathname: '/payment/success',
            params: { paymentId, orderId: firstOrderId, groupId: checkoutGroupId },
          } as any);
          return;
        }

        const paymentUrl: string | undefined = initData.paymentUrl;
        finalizeCart();
        router.replace({
          pathname: '/payment/[id]',
          params: {
            id: paymentId,
            orderId: firstOrderId,
            groupId: checkoutGroupId,
            provider: paymentProvider,
            guest: isAuthenticated ? '0' : '1',
            ...(paymentUrl ? { paymentUrl } : {}),
          },
        } as any);
      } catch (payErr: any) {
        const msg =
          payErr?.response?.data?.message ||
          'Ödeme başlatılamadı. Siparişinizi daha sonra siparişlerim üzerinden tamamlayabilirsiniz.';
        const status = payErr?.response?.status;
        const isStockout =
          (status === 400 || status === 409) &&
          typeof msg === 'string' &&
          STOCKOUT_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw.toLowerCase()));
        if (isStockout) {
          const productId = payErr?.response?.data?.productId || items[0]?.productId;
          if (productId) {
            router.replace({ pathname: '/products/unavailable/[productId]', params: { productId } } as any);
            return;
          }
        }
        appAlert('Ödeme Başlatılamadı', msg, [
          { text: 'Tamam', onPress: () => router.replace(isAuthenticated ? '/orders' : ('/' as any)) },
        ]);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      captureException(error, { level: 'error', tags: { flow: 'checkout' }, extra: { status: error?.response?.status } });
      const status = error?.response?.status;
      // Ayırt edici: `code`/`errorCode` YOK, yalnız i18nKey. Fiyatlar sunucuda
      // değişmiş — quote'u yenile, eski/yeni toplamı göster, yeniden onay iste.
      if (status === 409 && error?.response?.data?.i18nKey === 'server.shipping.pricingChanged') {
        const oldTotal = total;
        const refreshed = await quoteQuery.refetch();
        const newTotal = refreshed.data?.pricing?.summary?.total;
        alertRespectingOtpModal(
          'Fiyatlar Güncellendi',
          `Ürün veya kargo fiyatları güncellendi.\n\nÖnceki toplam: ${formatPrice(oldTotal)}\nYeni toplam: ${
            newTotal != null ? formatPrice(newTotal) : '—'
          }\n\nLütfen tutarı kontrol edip tekrar onaylayın.`,
        );
        return;
      }
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (Array.isArray(error.response?.data?.message)
          ? error.response?.data?.message.join(', ')
          : 'Sipariş oluşturulamadı');
      const isStockout =
        (status === 400 || status === 409) &&
        typeof errorMessage === 'string' &&
        STOCKOUT_KEYWORDS.some((kw) => errorMessage.toLowerCase().includes(kw.toLowerCase()));
      if (!isAuthenticated && emailVerificationCode && status === 400 && !isStockout) {
        setOtpError(extractApiMessage(error) ?? 'Doğrulama kodu geçersiz veya süresi dolmuş.');
        return;
      }
      if (isStockout) {
        const productId = error?.response?.data?.productId || items[0]?.productId;
        if (productId) {
          router.replace({ pathname: '/products/unavailable/[productId]', params: { productId } } as any);
          return;
        }
      }
      appAlert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      showSnackbar('Sepetiniz boş');
      return;
    }
    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string' || item.productId.length < 10) {
        appAlert('Hata', `Geçersiz ürün ID: ${item.title}`);
        return;
      }
    }
    if (isAuthenticated && user) {
      await proceedCheckout();
      return;
    }

    const guestErr = validateGuest(guestName, guestEmail, guestPhone);
    if (guestErr) {
      showSnackbar(guestErr);
      return;
    }
    const email = guestEmail.trim().toLowerCase();
    setOtpSending(true);
    try {
      const resp: any = await ordersApi.sendGuestVerificationCode({
        email,
        expectedCheckoutCount: Math.max(1, items.length),
      });
      const expiresIn = resp?.data?.data?.expiresInSeconds ?? resp?.data?.expiresInSeconds ?? 180;
      setOtpCode('');
      setOtpError(null);
      setOtpExpiresIn(expiresIn);
      setOtpModalOpen(true);
    } catch (e: any) {
      if (handleEmailAlreadyRegistered(e)) return;
      appAlert('Hata', extractApiMessage(e) ?? 'Doğrulama kodu gönderilemedi.');
    } finally {
      setOtpSending(false);
    }
  };

  const closeOtpModal = () => {
    setOtpModalOpen(false);
    setOtpCode('');
    setOtpError(null);
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) return;
    await proceedCheckout(otpCode);
  };

  const handleOtpResend = async () => {
    if (otpExpiresIn > 0 || otpSending) return;
    const email = guestEmail.trim().toLowerCase();
    setOtpSending(true);
    try {
      const resp: any = await ordersApi.sendGuestVerificationCode({
        email,
        expectedCheckoutCount: Math.max(1, items.length),
      });
      const expiresIn = resp?.data?.data?.expiresInSeconds ?? resp?.data?.expiresInSeconds ?? 180;
      setOtpExpiresIn(expiresIn);
      setOtpCode('');
      setOtpError(null);
    } catch (e: any) {
      if (handleEmailAlreadyRegistered(e)) {
        setOtpModalOpen(false);
        return;
      }
      setOtpError(extractApiMessage(e) ?? 'Kod gönderilemedi.');
    } finally {
      setOtpSending(false);
    }
  };

  return {
    isAuthenticated,
    items,
    step,
    setStep,
    // guest
    guestName, setGuestName,
    guestEmail, setGuestEmail,
    guestPhone, setGuestPhone,
    guestPhoneCountryCode, setGuestPhoneCountryCode,
    // address
    selectedAddressId, setSelectedAddressId,
    shippingAddress, setShippingAddress,
    billingDifferent, setBillingDifferent,
    selectedBillingAddressId, setSelectedBillingAddressId,
    billingAddress, setBillingAddress,
    addresses,
    // shipping/pricing — hepsi `pricing.summary`'den, istemci hesabı yok.
    shippingCost, shippingLoading, effectiveShippingCity,
    productAmount, serviceFeeAmount, total,
    quoteLoading: quoteQuery.isLoading,
    coupon,
    // ui
    loading,
    snackbar,
    dismissSnackbar: () => setSnackbar({ visible: false, message: '' }),
    handleNextStep,
    handleCheckout,
    // otp
    otpModalOpen, otpCode, setOtpCode, otpError, otpExpiresIn, otpSending,
    closeOtpModal, handleOtpSubmit, handleOtpResend,
  };
}
