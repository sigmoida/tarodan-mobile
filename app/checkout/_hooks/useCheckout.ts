import { useState, useEffect, useMemo, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appAlert, alertAfterClose, type AlertDialogButton } from '@/ui';
import { ordersApi, paymentsApi, addressesApi, cartApi, type OrderAddressInput, type OrderQuoteResponse } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { captureException } from '@/services/sentry';
import { formatServerPrice, serverAmount } from '@/utils/format';
import { indexQuoteLines } from '@/utils/quoteLines';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { DEFAULT_COUNTRY_CODE, normalizePhoneForPayload } from '@/utils/phone';
import { STOCKOUT_KEYWORDS, generateUuidV4, EMPTY_ADDRESS } from '../_lib/constants';
import { extractApiMessage, validateGuest, validateInlineAddress } from '../_lib/validation';
import { useCoupon } from './useCoupon';
import type { ShippingAddressInput, SavedAddress } from '../_lib/types';

/**
 * Modal kapanma animasyonu bitmeden `appAlert` çağırmak iOS'ta donuyor.
 * `alertAfterClose`'un kendi varsayılanıyla aynı gecikme — orada kapatma da
 * yapılıyor, burada modal zaten kapatılmış oluyor.
 */
const MODAL_CLOSE_ALERT_DELAY_MS = 400;

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

  const [otpModalOpenState, setOtpModalOpenState] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  /**
   * OTP modalının AÇIK/KAPALI durumu, closure'dan bağımsız.
   *
   * React Query, çalışan bir `queryFn`'i fetch'in BAŞLADIĞI render'ın closure'ıyla
   * yürütür. Aşağıdaki uyarı yardımcıları `otpModalOpen`'ı state'ten (closure'dan)
   * okusaydı şu senaryoda BAYAT `false` görürdü: kupon uygulanır (quote fetch
   * başlar, modal kapalı) → kullanıcı "Onayla ve Öde"ye basar → OTP modalı açılır
   * → gecikmiş quote 400'ü düşer → modal AÇIKKEN `appAlert` → iOS donar.
   */
  const otpModalOpenRef = useRef(false);
  const otpModalOpen = otpModalOpenState;
  const setOtpModalOpen = (open: boolean) => {
    otpModalOpenRef.current = open;
    setOtpModalOpenState(open);
  };
  /**
   * Modal kapanınca gösterilmek üzere bekleyen bilgilendirme (aşağıya bkz.).
   *
   * BİLİNEN SINIR (N5 — bilerek düzeltilmedi): ref ekranla birlikte yaşıyor.
   * Kullanıcı modalı kapatmadan checkout'tan çıkarsa (geri / sepete dön)
   * ertelenmiş uyarı hiç gösterilmez, sessizce kaybolur. Ertelenen olaylar
   * yalnızca GEÇİCİ bilgilendirmeler (kupon düştü) ve düşen kuponun görsel
   * karşılığı zaten ekranda (rozet kayboluyor); kalıcı bir kuyruk kurmak, o
   * uyarıyı ilgisiz bir ekranın üstüne düşürme riskini getirirdi.
   */
  const pendingAlertRef = useRef<{ title: string; message?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const closeOtpModal = () => {
    setOtpModalOpen(false);
    setOtpCode('');
    setOtpError(null);
    const pending = pendingAlertRef.current;
    if (pending) {
      pendingAlertRef.current = null;
      setTimeout(() => appAlert(pending.title, pending.message), MODAL_CLOSE_ALERT_DELAY_MS);
    }
  };

  /**
   * GEÇİCİ / bilgilendirici uyarı (kupon düştü, quote tazelendi…).
   *
   * OTP modalı açıkken `appAlert` iOS'ta donuyor; modalı KAPATMAK ise kullanıcının
   * OTP oturumunu boşa düşürür (yeniden kod istemek zorunda kalır) — geçici bir
   * olay bunu hak etmiyor. Uyarıyı ERTELE, modal kapanınca göster.
   */
  const alertDeferredWhileOtpOpen = (title: string, message?: string) => {
    if (otpModalOpenRef.current) {
      pendingAlertRef.current = { title, message };
      return;
    }
    appAlert(title, message);
  };

  /**
   * ENGELLEYİCİ uyarı — kullanıcı devam edemiyor, mesajı ŞİMDİ görmeli.
   * Modal açıkken modal İÇİNDE satır içi basılır: kod alanı ve OTP oturumu korunur.
   */
  const alertInlineWhileOtpOpen = (title: string, message: string) => {
    if (otpModalOpenRef.current) {
      setOtpError(message);
      return;
    }
    appAlert(title, message);
  };

  /**
   * Akışı SONLANDIRAN uyarı (fiyat değişti, sipariş oluştu ama ödeme başlatılamadı,
   * e-posta zaten kayıtlı → misafir akışı burada biter). Modal önce kapanır, sonra
   * uyarı gösterilir; `buttons` verilirse aksiyonlu uyarı basılır.
   *
   * Bekleyen ERTELENMİŞ bilgilendirme (ör. "kupon düştü") burada DÜŞÜRÜLÜR: akış
   * zaten sona eriyor, ve iki uyarıyı aynı anda kuyruğa koymak kullanıcıya
   * üst üste iki dialog gösterirdi. Sonlandırıcı mesaj eyleme dönük olandır.
   */
  const alertAfterOtpClose = (title: string, message?: string, buttons?: AlertDialogButton[]) => {
    if (otpModalOpenRef.current) {
      pendingAlertRef.current = null;
      alertAfterClose(closeOtpModal, title, message, buttons);
      return;
    }
    appAlert(title, message, buttons);
  };

  // Kupon: `/discounts/validate` ile doğrulanır. Doğrulanmış kod quote'a da
  // gönderilir (aşağıda) — sunucu `summary.productAmount`'ı "kupon sonrası ara
  // toplam" olarak tanımlıyor; kod gitmezse bu alan indirimsiz kalır ve
  // `summary.total` checkout'ta gerçekte tahsil edilenden FAZLA görünür.
  const coupon = useCoupon(items, isAuthenticated);

  const queryClient = useQueryClient();
  const itemsSignature = useMemo(
    () => items.map((it) => `${it.productId}:${it.quantity}`).join(','),
    [items],
  );

  /**
   * Quote 400'ü KUPONA mı ait?
   *
   * Quote kupon dışı sebeplerle de 400 döndürebilir (geçersiz `productId`, stok).
   * Her 400'ü kupona yormak, kuponu haksız yere düşürüp "Kupon Geçersiz" başlığıyla
   * yanlış bilgi verir. Sunucunun `i18nKey`/`message` metnine bak.
   */
  const isCouponRejection = (err: any, sentCouponCode?: string): boolean => {
    if (!sentCouponCode) return false;
    if (err?.response?.status !== 400) return false;
    const i18nKey = typeof err?.response?.data?.i18nKey === 'string' ? err.response.data.i18nKey : '';
    return /kupon|coupon|discount|indirim/i.test(`${i18nKey} ${extractApiMessage(err) ?? ''}`);
  };

  // Quote'un KÖKÜ korunur — `pricingHash` + `shippingTariffVersion` kökte,
  // `pricing` içinde DEĞİL, ve order-create payload'larına aynen geri gider.
  // `couponCode` queryKey'e DAHİL: kupon uygulanınca/kaldırılınca quote tazelenir.
  const quoteQuery = useQuery({
    queryKey: qk.checkout.quote(itemsSignature, coupon.couponCode),
    queryFn: async () => {
      const baseItems = items.map((it) => ({ productId: it.productId, quantity: it.quantity }));
      const couponCode = coupon.couponCode;
      try {
        const res = await ordersApi.getQuote({
          items: baseItems,
          ...(couponCode ? { couponCode } : {}),
        });
        return unwrapEnvelope<OrderQuoteResponse>(res);
      } catch (err: any) {
        // Kupon dışı hatalar olduğu gibi yukarı gider → sorgu hata durumuna
        // düşer, ekran ErrorState + "Tekrar Dene" gösterir (kilitlenmez).
        if (!isCouponRejection(err, couponCode)) throw err;

        // Kupon arada geçersizleşmiş (süre doldu / kullanım limiti). Kuponu düşür:
        // bu, queryKey'i kuponsuz anahtara çevirir. Kuponsuz sonucu ÖNDEN çekip
        // KUPONSUZ anahtara yaz — kuponsuz cevabı KUPONLU anahtar altında
        // döndürmek önbelleği zehirliyordu: aynı kod 60 sn (staleTime) içinde
        // yeniden uygulanırsa istek hiç gitmez, uyarı çıkmaz, "uygulandı" rozeti
        // kalır ve sipariş ucundan bu kez ham 400 gelir.
        coupon.remove();
        alertDeferredWhileOtpOpen(
          'Kupon Geçersiz',
          extractApiMessage(err) ?? 'Kupon kodu artık geçerli değil, kaldırıldı.',
        );
        try {
          const retryRes = await ordersApi.getQuote({ items: baseItems });
          queryClient.setQueryData(qk.checkout.quote(itemsSignature, undefined), unwrapEnvelope<OrderQuoteResponse>(retryRes));
        } catch {
          // Kuponsuz deneme de başarısızsa bir şey yazma — kuponsuz anahtar
          // kendi isteğini atar ve gerekirse hata yolunu (ErrorState) kullanır.
        }
        // Bu ANAHTAR gerçekten başarısız oldu; hata olarak bırak ki aynı kupon
        // yeniden uygulanınca istek tekrar gitsin ve uyarı yine çıksın.
        throw err;
      }
    },
    enabled: items.length > 0,
    staleTime: 60_000,
    // 4xx yeniden denenmez (tek kaynak — sepet aynı yüklemi kullanır, §5).
    retry: retryUnlessClientError,
  });
  const quote = quoteQuery.data;
  const summary = quote?.pricing?.summary;
  // ————————————————————————————————————————————————————————————————
  // Gösterilen HER tutar bir sunucu alanının aynısıdır. Kapı ALAN seviyesinde:
  // `summary != null` kontrolü alanın kendisi hakkında hiçbir şey söylemez —
  // `Number(null)` = 0 ve `Number(undefined)` = NaN olduğu için `total: null`
  // gelen bir yanıt "0,00 TL" yazan ETKİN bir ödeme butonu üretirdi. Sayı
  // değilse tutar YOK sayılır → ekran yer tutucu basar, buton devre dışı kalır.
  // ————————————————————————————————————————————————————————————————
  const shippingCost = serverAmount(summary?.shippingAmount);
  const productAmount = serverAmount(summary?.productAmount);
  /** Hizmet bedeli + TÜM alıcı hizmet KDV'si — ayrı bir KDV satırı basılmaz. */
  const serviceFeeAmount = serverAmount(summary?.serviceFeeAmount);
  const total = serverAmount(summary?.total);
  /**
   * Sunucunun uyguladığı indirim — quote yanıtının KÖKÜNDEKİ `couponDiscount`.
   * `/discounts/validate`'in `estimatedDiscount`'u DEĞİL: o yalnız bir tahmin ve
   * özet satırlarıyla tutarlı değil. Özet satırı olarak basılmaz (üç satır zaten
   * toplama eşit); yalnız kupon rozetinde bilgilendirme olarak gösterilir.
   */
  const couponDiscount = serverAmount(quote?.couponDiscount);
  const shippingLoading = quoteQuery.isLoading;

  /**
   * Satır tutarları — sunucunun `items[]` kırılımından, `productId` ile eşlenir.
   * Sepet satırındaki `price` sepete EKLEME anında donuyor (24 saat) ve ürünlerde
   * kampanya penceresi var; `price × quantity` çarpımı kampanya sepette
   * beklerken biterse özet satırlarıyla ayrışıyordu. Eşleşme yoksa `null` →
   * ekran yer tutucu basar, yerel çarpıma DÜŞMEZ.
   */
  const quoteLines = useMemo(() => indexQuoteLines(quote?.items), [quote]);
  const lineSubtotalFor = (productId: string): number | null =>
    quoteLines.get(productId)?.subtotal ?? null;

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

  // NOT: kargo satırı artık şehre bağlı değil — quote şehirden bağımsız (`items`
  // gövdesi) ve `summary.total` kargoyu zaten içeriyor. Şehre bakan
  // `effectiveShippingCity` kapısı kaldırıldı (satırlar her zaman toplama eşit).

  const showSnackbar = (message: string) => setSnackbar({ visible: true, message });

  /**
   * "Bu e-posta zaten kayıtlı" → misafir akışı BURADA BİTER (kullanıcı login'e
   * yönlendirilir), dolayısıyla SONLANDIRICI: OTP modalı açıksa (kod yeniden
   * gönderilirken bu hata gelebilir) önce kapatılır, uyarı sonra basılır. Modalı
   * açık bırakmak anlamsız olurdu — girilecek bir kod artık yok.
   */
  const handleEmailAlreadyRegistered = (e: any): boolean => {
    if (e?.response?.status === 409 || e?.response?.data?.code === 'EMAIL_ALREADY_REGISTERED') {
      alertAfterOtpClose(
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
      // Hata halinde mesaj FARKLI: "yükleniyor" demek yanlış olurdu — sorgu
      // 4xx'te hiç, ağ hatasında `retry` tükendikten sonra kendiliğinden
      // tazelenmiyor (`refetchOnWindowFocus: false`); kullanıcı özet kartındaki
      // "Tekrar Dene" düğmesine basmalı.
      alertInlineWhileOtpOpen(
        quoteQuery.isError ? 'Fiyat Bilgisi Alınamadı' : 'Fiyat Bilgisi Hazır Değil',
        quoteQuery.isError
          ? 'Fiyat bilgisi alınamadı. Ödeme detayı kartındaki "Tekrar Dene" ile yeniden deneyin.'
          : 'Fiyat bilgisi yükleniyor, lütfen birkaç saniye sonra tekrar deneyin.',
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
        // SONLANDIRICI: sipariş oluştu, sepet boşaltılıyor ve kullanıcı
        // /orders'a taşınıyor — OTP modalı açıksa (misafir onayı) önce kapanmalı,
        // yoksa uyarı modalın üstüne düşer (iOS donması) ve kapanan ekranın
        // üzerinde asılı kalır.
        alertAfterOtpClose(
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
        // SONLANDIRICI: butonun kendisi ekranı terk ediyor (siparişlerim / ana
        // sayfa). Modal açıkken bu uyarıyı basmak hem donduruyor hem de altında
        // hiçbir işe yaramayan bir OTP formu bırakıyordu → önce kapat.
        alertAfterOtpClose('Ödeme Başlatılamadı', msg, [
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
        // Geçici DEĞİL: kullanıcı ana ekranda yeni tutarı görüp yeniden
        // onaylamalı → OTP modalı açıksa önce kapatılır.
        alertAfterOtpClose(
          'Fiyatlar Güncellendi',
          `Ürün veya kargo fiyatları güncellendi.\n\nÖnceki toplam: ${formatServerPrice(
            oldTotal,
          )}\nYeni toplam: ${formatServerPrice(newTotal)}\n\nLütfen tutarı kontrol edip tekrar onaylayın.`,
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
      // ENGELLEYİCİ (sonlandırıcı DEĞİL): buraya düşen hatalar ya geçici sunucu/ağ
      // hataları (5xx) ya da yönlendirilecek `productId`'si olmayan stok
      // hatalarıdır — "kod geçersiz" durumu yukarıda zaten satır içi işleniyor.
      // Girilen OTP kodu HÂLÂ GEÇERLİ olduğu için modalı kapatmak kullanıcıyı
      // yeni kod istemeye zorlardı; mesajı modalın İÇİNDE göster, "Onayla"ya
      // yeniden basabilsin.
      alertInlineWhileOtpOpen('Hata', typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
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
      // `handleEmailAlreadyRegistered` modalı `closeOtpModal` üzerinden kapatır:
      // ham `setOtpModalOpen(false)` `otpCode`/`otpError`'ı temizlemiyor ve
      // `pendingAlertRef`'i boşaltmıyordu → ertelenmiş bir uyarı askıda kalırdı.
      if (handleEmailAlreadyRegistered(e)) return;
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
    // shipping/pricing — hepsi `pricing.summary`'den AYNEN; sunucu değeri yoksa
    // `null` (yer tutucu basılır, yerel sayı uydurulmaz).
    shippingCost, shippingLoading,
    productAmount, serviceFeeAmount, total,
    /** Satır tutarı — sunucunun `items[].subtotal`'ı; yoksa `null` (yer tutucu). */
    lineSubtotalFor,
    quoteLoading: quoteQuery.isLoading,
    /** Quote hatası — ekran ErrorState + "Tekrar Dene" gösterir (CLAUDE.md §11). */
    quoteError: quoteQuery.isError,
    retryQuote: () => {
      void quoteQuery.refetch();
    },
    coupon,
    /** Sunucunun uyguladığı indirim (quote kökü) — rozet bilgisi, özet satırı değil. */
    couponDiscount,
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
