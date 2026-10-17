import { logger, safeError } from '@/services/logger';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appAlert, alertAfterClose, toast, type AlertDialogButton } from '@/ui';
import {
  ordersApi,
  paymentsApi,
  addressesApi,
  toExpectedPricing,
  type ExpectedPricingSnapshot,
  type OrderAddressInput,
  type OrderQuoteResponse,
} from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { useLatestRef } from '@/hooks/useLatestRef';
import { captureException } from '@/services/sentry';
import { formatServerPrice, serverAmount } from '@/utils/format';
import { indexQuoteLines } from '@/utils/quoteLines';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { DEFAULT_COUNTRY_CODE, parsePhoneForPayload, getPhoneInvalidMessage } from '@/utils/phone';
import { STOCKOUT_KEYWORDS, generateUuidV4, EMPTY_ADDRESS } from '../_lib/constants';
import { createAddressStore } from '../_lib/addressStore';
import { toOrderLineItems } from '../_lib/lineItems';
import {
  addressPhoneError,
  extractApiMessage,
  validateGuest,
  validateInlineAddress,
} from '../_lib/validation';
import { useCoupon } from './useCoupon';
import { useZodForm } from '@/ui/form';
import { guestContactSchema, GUEST_CONTACT_DEFAULTS } from '../_lib/schema';
import type { SavedAddress } from '../_lib/types';

/**
 * Modal kapanma animasyonu bitmeden `appAlert` çağırmak iOS'ta donuyor.
 * `alertAfterClose`'un kendi varsayılanıyla aynı gecikme — orada kapatma da
 * yapılıyor, burada modal zaten kapatılmış oluyor.
 */
const MODAL_CLOSE_ALERT_DELAY_MS = 400;

type ServerPrice = number | string | null | undefined;

// Sabit boş diziler: `?? []` her render'da yeni referans üretip memo'lu bölümleri boşa çizdiriyordu.
const NO_UNAVAILABLE: NonNullable<OrderQuoteResponse['unavailableItems']> = [];
const NO_ADDRESSES: SavedAddress[] = [];

/**
 * Payload'a girecek telefonların TAMAMI. Bir alan `null` ise o telefon bu
 * siparişte hiç gönderilmiyor demektir (kayıtlı adres seçili → telefon
 * sunucuda; fatura adresi kapalı; üye akışı → `guest` yok).
 */
interface ResolvedPhones {
  /** `shippingAddress.inline.phone` */
  shipping: string | null;
  /** `billingAddress.inline.phone` */
  billing: string | null;
  /** `checkoutGuest.phone` (misafir iletişim) */
  guest: string | null;
}

/**
 * Çözülemeyen telefon — payload'a ASLA girmez. `isClientValidation` bayrağı
 * `catch` tarafında ağ hatasından ayırt etmeye yarar (adres/profil formlarıyla
 * aynı kalıp). Mesaj numarayı BASMAZ: PII log'a/Sentry'ye gitmez.
 */
class PhoneRejectedError extends Error {
  readonly isClientValidation = true;
  constructor(message: string) {
    super(message);
    this.name = 'PhoneRejectedError';
  }
}

/**
 * EMNİYET KEMERİ — `resolvePayloadPhones` her çağrı yerinin dalını zaten
 * karşılıyor; bu son kapı, ileride bir dal eklenirse boş telefonun SESSİZCE
 * payload'a girmesini (eski `normalizePhoneForPayload` davranışı) imkânsız kılar.
 */
const requirePhone = (phone: string | null, message: string): string => {
  if (!phone) throw new PhoneRejectedError(message);
  return phone;
};

/**
 * Checkout controller'ı — tüm form durumu, query'ler, kargo hesabı, payload
 * kurucuları ve ödeme akışı (`proceedCheckout` + misafir OTP) burada. Ekran
 * yalnız bölümleri kompoze eder (web gibi tek sayfa; adım durumu yok). Ödeme
 * dallanmaları orijinalden BİREBİR taşındı — tek sayfaya geçişte eklenen tek şey,
 * eski adım-1 "Devam Et" kapısının `handleCheckout`'un başına taşınması.
 */
export function useCheckout() {
  const { t } = useTranslation();
  const { buyNow } = useLocalSearchParams<{ buyNow?: string }>();
  const isBuyNow = buyNow === '1';
  const cartItems = useCartStore((s) => s.items);
  const deselectedIds = useCartStore((s) => s.deselectedIds);
  const onPurchaseComplete = useCartStore((s) => s.onPurchaseComplete);
  const buyNowItem = useCartStore((s) => s.buyNowItem);
  const clearBuyNow = useCartStore((s) => s.clearBuyNow);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  /**
   * Ödenecek satırlar. Sepet yolunda kullanıcının SEÇTİKLERİ — uç zaten yalnız
   * gönderilen `items`'ı fiyatlıyor ve yalnız onları sepetten düşüyor.
   */
  const items = useMemo(
    () =>
      isBuyNow
        ? buyNowItem
          ? [buyNowItem]
          : []
        : cartItems.filter((i) => !deselectedIds.includes(i.id)),
    [isBuyNow, buyNowItem, cartItems, deselectedIds],
  );

  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();

  const itemsSignature = useMemo(
    () => items.map((it) => `${it.productId}:${it.quantity}`).join(','),
    [items],
  );

  // Anahtar satır İÇERİĞİNE bağlı (`itemsSignature`): `items` useMemo'su sepet store'u her
  // değiştiğinde (aynı içerikle bile) yeni dizi üretir; kimliğe bağlı anahtar aynı sepette
  // gereksiz yere yenileniyordu. Satırlar/adetler değişince yine yenilenir.
  const idempotencyKeyRef = useRef(generateUuidV4());
  useEffect(() => {
    idempotencyKeyRef.current = generateUuidV4();
  }, [itemsSignature]);

  /**
   * Misafir iletişim alanları RHF'de (`CheckoutGuestFields`): tuş vuruşu bu controller'ı
   * yeniden çizmez. Değerler doğrulama/gönderim anında `getValues()` ile okunur — eskiden
   * render closure'ından okunan state'in aynısı (her tuşta render olduğu için hep günceldi).
   */
  const guestForm = useZodForm(guestContactSchema, { defaultValues: GUEST_CONTACT_DEFAULTS });
  const readGuest = () => {
    const g = guestForm.getValues();
    return {
      guestName: g.name ?? '',
      guestEmail: g.email ?? '',
      guestPhone: g.phone ?? '',
      guestPhoneCountryCode: g.phoneCountryCode || DEFAULT_COUNTRY_CODE,
    };
  };

  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  // Inline adresler controller state'i DEĞİL (tuş vuruşu controller'ı çalıştırmasın): yaprak
  // `useAddressValue` ile abone olur, burada yalnız doğrulama/gönderim anında `get()` okunur.
  const [shippingAddressStore] = useState(() => createAddressStore(EMPTY_ADDRESS));
  const setShippingAddress = shippingAddressStore.set;
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | 'new'>('new');
  const [billingAddressStore] = useState(() => createAddressStore(EMPTY_ADDRESS));
  const setBillingAddress = billingAddressStore.set;

  const paymentProvider = 'paytr' as const;

  const [otpModalOpenState, setOtpModalOpenState] = useState(false);
  /**
   * OTP kodu modalın KENDİ state'inde (`OtpModal`): tuş vuruşu checkout'u yeniden çizmez.
   * Controller kodu temizlemek istediğinde (eskiden `setOtpCode('')`) bu sayacı artırır;
   * modal sayaç değişince kodu boşaltır. Gönderimde kod `handleOtpSubmit(code)` ile gelir.
   */
  const [otpCodeResetSeq, setOtpCodeResetSeq] = useState(0);
  const resetOtpCode = () => setOtpCodeResetSeq((n) => n + 1);
  const [otpSending, setOtpSending] = useState(false);
  /**
   * Kodun yeniden gönderilebileceği an (ms). Saniyelik geri sayım modalın içinde
   * (`OtpModal`) bundan türetilir — eskiden burada her saniye `setOtpExpiresIn` tüm checkout'u
   * yeniden çiziyordu. Kural aynı: süre dolmadan "tekrar gönder" çalışmaz.
   */
  const [otpResendAt, setOtpResendAt] = useState(0);
  /** Kodun gönderildiği e-posta — modal metni için (alan değeri her tuşta okunmasın). */
  const [otpEmail, setOtpEmail] = useState('');
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

  /**
   * Mesafeli satış sözleşmesi onayı. Sunucuya İLK çağrıda gider — idempotency
   * replay'i sonradan gelen onayı işlemez (aynı anahtarla ikinci istek ilk
   * yanıtı tekrarlar), o yüzden "önce öde, sonra onayla" diye bir yol yok.
   */
  const [distanceSalesAccepted, setDistanceSalesAccepted] = useState(false);

  const [loading, setLoading] = useState(false);

  const closeOtpModal = () => {
    setOtpModalOpen(false);
    resetOtpCode();
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

  /**
   * Ödeme bittikten sonra sepet. `DELETE /cart` ÇAĞRILMAZ: sunucu satın alınan
   * satırları transaction içinde zaten siliyor, ekstra silme hem gereksiz hem —
   * satır seçimi geldiğinden beri — yıkıcı: seçilmeyen satırlar da uçardı.
   * Yerelde yalnız ödenenler düşer, sunucu sepeti yeniden çekilir.
   */
  const finalizeCart = () => {
    // "Hemen Al" ürünü sepete de ekliyor (web paritesi: vazgeçilirse kaybolmasın); ödendiyse
    // sepetteki satırı da düşer. Sepetin geri kalanı (ödemeye girmeyen satırlar) yerinde kalır.
    if (isBuyNow) clearBuyNow();
    onPurchaseComplete(items.map((i) => i.productId));
    if (isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: qk.cart.mine });
    }
  };
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
      // Checkout gövdesi de AYNI üreticiden çıkar — adet imzaya dahil (A-1.1).
      const baseItems = toOrderLineItems(items);
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
          t('checkout.couponInvalidTitle'),
          extractApiMessage(err) ?? t('checkout.couponInvalidBody'),
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
    // 4xx yeniden denenmez (tek kaynak — sepet aynı yüklemi kullanır, CLAUDE.md › Principles).
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
   * Kampanya kazançları — TOPLANAN DEĞİL, AÇIKLAMA satırları.
   *
   * `productAmount` / `serviceFeeAmount` zaten indirimli tutarı taşıyor; bu
   * alanlar kazancın KAYNAĞINI söyler. Aksi halde "2 al 1 öde" ya da bir bedel
   * kampanyası, toplam düşerken hiçbir yerde etiketlenmeden eriyordu (web bunu
   * 2026-08-13'te düzeltti; mobil geride kalmıştı).
   *
   * `quantityDiscount`/`feeDiscountTotal` staging'de doğrulandı (her ölçümde 0 —
   * hesapta aktif kampanya yok), `feeDiscounts` satırlarının DOLU hâli
   * görülemedi; o yüzden dizi savunmacı okunur.
   */
  const quantityDiscount = serverAmount(summary?.quantityDiscount);
  const feeDiscountTotal = serverAmount(summary?.feeDiscountTotal);
  const feeDiscounts = useMemo(
    () => (Array.isArray(summary?.feeDiscounts) ? summary!.feeDiscounts! : []),
    [summary],
  );
  /**
   * Sunucunun uyguladığı indirim — quote yanıtının KÖKÜNDEKİ `couponDiscount`.
   * `/discounts/validate`'in `estimatedDiscount`'u DEĞİL: o yalnız bir tahmin ve
   * özet satırlarıyla tutarlı değil. Özet satırı olarak basılmaz (üç satır zaten
   * toplama eşit); yalnız kupon rozetinde bilgilendirme olarak gösterilir.
   */
  const couponDiscount = serverAmount(quote?.couponDiscount);
  const shippingLoading = quoteQuery.isLoading;

  /** Quote'un fiyatlayamadığı satırlar — bilgi amaçlı, tutar türetilmez. */
  const unavailableItems = quote?.unavailableItems ?? NO_UNAVAILABLE;

  /**
   * Ayrılan satırlar ödeme ÖZETİNDEN de çıkar (delta 18 §2): sunucu bunları
   * fiyatlamadı, dolayısıyla `pricing.summary` içinde de yoklar. Özet listesinde
   * bırakmak satırı "—" tutarıyla gösterir, ürün sayacını da şişirir
   * ("Ara Toplam (3 ürün)" derken 2 ürünün parası çekilir). Ayrılan satırlar
   * uyarı kartında adlarıyla gösterilir — bilgi kaybolmaz, yalnız yeri değişir.
   */
  // `unavailableItems` her render'da yeni dizi; kimlik yerine İÇERİĞE bağlanmalı.
  // İmzayı ayrı bir `useMemo`'da üretmek `itemsSignature` ile aynı kalıp ve
  // `exhaustive-deps` susturmasına gerek bırakmıyor (susturma, ileride eklenen
  // bir bağımlılığın sessizce kaçmasına da açık kapı bırakıyordu).
  const unavailableSignature = useMemo(
    () => unavailableItems.map((u) => u.productId).join(','),
    [unavailableItems],
  );
  const unavailableProductIds = useMemo(
    () => new Set(unavailableSignature ? unavailableSignature.split(',') : []),
    [unavailableSignature],
  );
  const payableItems = useMemo(
    () => items.filter((i) => !unavailableProductIds.has(i.productId)),
    [items, unavailableProductIds],
  );
  /** Ayrılan satırın sepetteki adı — `quote.items[]`'ta bu satır YOK, ad sepetten gelir. */
  const cartTitleFor = useCallback(
    (productId: string): string | undefined => items.find((i) => i.productId === productId)?.title,
    [items],
  );

  // Sunucu satırı ayırdıysa sepetin yerel kopyası bayat: satır artık satın
  // alınamaz. Sepeti tazele (silme İSTEĞİ atma — sunucu zaten kendi kararını verdi).
  useEffect(() => {
    if (unavailableItems.length > 0) {
      void queryClient.invalidateQueries({ queryKey: qk.cart.mine });
    }
  }, [unavailableItems.length, queryClient]);

  /**
   * Satır tutarları — sunucunun `items[]` kırılımından, `productId` ile eşlenir.
   * Sepet satırındaki `price` sepete EKLEME anında donuyor (sepette süresiz bekleyebilir) ve ürünlerde
   * kampanya penceresi var; `price × quantity` çarpımı kampanya sepette
   * beklerken biterse özet satırlarıyla ayrışıyordu. Eşleşme yoksa `null` →
   * ekran yer tutucu basar, yerel çarpıma DÜŞMEZ.
   */
  const quoteLines = useMemo(() => indexQuoteLines(quote?.items), [quote]);
  const lineSubtotalFor = useCallback(
    (productId: string): number | null => quoteLines.get(productId)?.subtotal ?? null,
    [quoteLines],
  );
  /** Sunucunun fiyatladığı adet; satır eşleşmezse `null` → ekran yerel adede döner. */
  const lineQuantityFor = useCallback(
    (productId: string): number | null => quoteLines.get(productId)?.quantity ?? null,
    [quoteLines],
  );

  const addressesQuery = useQuery({
    queryKey: qk.addresses.mine,
    queryFn: async () => {
      const response = await addressesApi.getAll();
      const list: SavedAddress[] = (response.data as any)?.data ?? response.data ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: isAuthenticated,
  });
  const addresses = addressesQuery.data ?? NO_ADDRESSES;

  useEffect(() => {
    if (!isAuthenticated || addresses.length === 0) return;
    if (selectedAddressId !== 'new') return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, addresses]);

  // NOT: kargo satırı artık şehre bağlı değil — quote şehirden bağımsız (`items`
  // gövdesi) ve `summary.total` kargoyu zaten içeriyor. Şehre bakan
  // `effectiveShippingCity` kapısı kaldırıldı (satırlar her zaman toplama eşit).


  /**
   * "Bu e-posta zaten kayıtlı" → misafir akışı BURADA BİTER (kullanıcı login'e
   * yönlendirilir), dolayısıyla SONLANDIRICI: OTP modalı açıksa (kod yeniden
   * gönderilirken bu hata gelebilir) önce kapatılır, uyarı sonra basılır. Modalı
   * açık bırakmak anlamsız olurdu — girilecek bir kod artık yok.
   */
  const handleEmailAlreadyRegistered = (e: any): boolean => {
    if (e?.response?.status === 409 || e?.response?.data?.code === 'EMAIL_ALREADY_REGISTERED') {
      alertAfterOtpClose(
        t('checkout.emailRegisteredTitle'),
        extractApiMessage(e) ?? t('checkout.emailRegisteredBody'),
      );
      router.push('/(auth)/login' as any);
      return true;
    }
    return false;
  };

  /**
   * Inline teslimat adresinin telefonu — alan boşsa misafir iletişim telefonuna
   * düşer. Ülke kodu ile numara BİRLİKTE taşınır: numara `guestPhone`'dan
   * gelirken ülke kodunu `shippingAddress`'ten okumak, `+1 415 555 0100` gibi
   * bir girdiyi TR sanıp doğrulamayı ayrıştırırdı. `buildShippingPayload`'un
   * eşleştirmesiyle AYNI (tek kaynak, CLAUDE.md › Principles).
   */
  const shippingPhoneSource = (): { phone: string; countryCode: string } => {
    const { guestPhone, guestPhoneCountryCode } = readGuest();
    const shippingAddress = shippingAddressStore.get();
    return shippingAddress.phone.trim()
      ? {
          phone: shippingAddress.phone,
          countryCode: shippingAddress.phoneCountryCode ?? DEFAULT_COUNTRY_CODE,
        }
      : { phone: guestPhone, countryCode: guestPhoneCountryCode };
  };

  /**
   * Teslimat/fatura/iletişim alanları. Eskiden 3 adımlı akışın 1. adımının
   * "Devam Et" kapısıydı; tek sayfada ödeme düğmesine basışın ilk kapısı
   * (`handleCheckout`) — kural AYNI, yalnız çağrıldığı yer değişti.
   */
  const validateAddressForm = (): string | null => {
    const shippingAddress = shippingAddressStore.get();
    const billingAddress = billingAddressStore.get();
    if (!isAuthenticated) {
      const { guestName, guestEmail, guestPhone, guestPhoneCountryCode } = readGuest();
      const guestErr = validateGuest(guestName, guestEmail, guestPhone, guestPhoneCountryCode);
      if (guestErr) return guestErr;
    }
    if (isAuthenticated && selectedAddressId !== 'new') {
      // Kayıtlı adres seçildi → OK
    } else {
      const src = shippingPhoneSource();
      const err = validateInlineAddress({
        ...shippingAddress,
        phone: src.phone.trim(),
        phoneCountryCode: src.countryCode,
      });
      if (err) return err;
    }
    if (billingDifferent) {
      if (isAuthenticated && selectedBillingAddressId !== 'new') {
        // Kayıtlı seçildi → OK
      } else {
        const err = validateInlineAddress(billingAddress, t('checkout.billingAddressLabel'));
        if (err) return err;
      }
    }
    return null;
  };

  /**
   * Gönderime girecek her telefonu `setLoading(true)`'dan ÖNCE çözer.
   *
   * ⚠️ Eskiden `normalizePhoneForPayload` geçersiz numarada sessizce `''`
   * döndürüyordu: kullanıcı hata görmeden ham bir 400 yiyordu (öncesinde ise
   * kırpılmış, ULAŞILAMAZ bir numara gönderiliyordu). Artık gönderim hiç
   * başlamaz ve sebep ekranda görünür.
   *
   * Mesaj numarayı BASMAZ (PII log/uyarıya sızmasın).
   */
  const resolvePayloadPhones = (): { ok: true; phones: ResolvedPhones } | { ok: false; message: string } => {
    const phones: ResolvedPhones = { shipping: null, billing: null, guest: null };
    const billingAddress = billingAddressStore.get();

    if (!(isAuthenticated && user)) {
      const { guestPhone, guestPhoneCountryCode } = readGuest();
      const guest = parsePhoneForPayload(guestPhone, guestPhoneCountryCode);
      if (!guest) return { ok: false, message: getPhoneInvalidMessage() };
      phones.guest = guest;
    }

    // Kayıtlı adres seçiliyse inline adres hiç gönderilmiyor → çözülecek telefon yok.
    if (!(isAuthenticated && selectedAddressId !== 'new')) {
      const src = shippingPhoneSource();
      const shipping = parsePhoneForPayload(src.phone, src.countryCode);
      if (!shipping) {
        // Boş alan ile çözülemeyen numara farklı hatalar — mesaj tek kaynaktan.
        return { ok: false, message: addressPhoneError(src.phone, src.countryCode, t('checkout.shippingAddressLabel'))! };
      }
      phones.shipping = shipping;
    }

    if (billingDifferent && !(isAuthenticated && selectedBillingAddressId !== 'new')) {
      const billing = parsePhoneForPayload(
        billingAddress.phone,
        billingAddress.phoneCountryCode ?? DEFAULT_COUNTRY_CODE,
      );
      if (!billing) {
        return {
          ok: false,
          message: addressPhoneError(
            billingAddress.phone,
            billingAddress.phoneCountryCode ?? DEFAULT_COUNTRY_CODE,
            t('checkout.billingAddressLabel'),
          )!,
        };
      }
      phones.billing = billing;
    }

    return { ok: true, phones };
  };

  const buildShippingPayload = (phones: ResolvedPhones): { id?: string; inline?: OrderAddressInput } => {
    if (isAuthenticated && selectedAddressId !== 'new') {
      return { id: selectedAddressId };
    }
    const shippingAddress = shippingAddressStore.get();
    return {
      inline: {
        fullName: shippingAddress.fullName.trim(),
        phone: requirePhone(phones.shipping, `Teslimat adresi — ${getPhoneInvalidMessage()}`),
        city: shippingAddress.city.trim(),
        district: shippingAddress.district.trim(),
        address: shippingAddress.address.trim(),
        zipCode: shippingAddress.zipCode?.trim() || undefined,
      },
    };
  };

  const buildBillingPayload = (phones: ResolvedPhones): { id?: string; inline?: OrderAddressInput } | null => {
    if (!billingDifferent) return null;
    if (isAuthenticated && selectedBillingAddressId !== 'new') {
      return { id: selectedBillingAddressId };
    }
    const billingAddress = billingAddressStore.get();
    return {
      inline: {
        fullName: billingAddress.fullName.trim(),
        phone: requirePhone(phones.billing, `Fatura adresi — ${getPhoneInvalidMessage()}`),
        city: billingAddress.city.trim(),
        district: billingAddress.district.trim(),
        address: billingAddress.address.trim(),
        zipCode: billingAddress.zipCode?.trim() || undefined,
      },
    };
  };

  /**
   * Gönderimden önceki UCUZ yerel kontroller (fiyat imzası hazır mı, telefonlar
   * çözülüyor mu). `proceedCheckout`'un ilk iki adımı AYNEN buraya taşındı;
   * üye dalında kimlik kapısından ÖNCE de çağrılır — fiyat hazır değilken ya da
   * telefon hatalıyken üyeye önce kimlik sorulmasın. Sorun varsa uyarıyı
   * kendisi basar ve `null` döner.
   */
  const checkoutReadiness = () => {
    // Dört alanın DÖRDÜ de API DTO'sunda zorunlu — yarım gövde göndermek yalnız
    // aynı 400'ü başka bir şekilde üretir. Türetici tek kaynak (`@/lib/api`).
    const expectedPricing = toExpectedPricing(quote);
    if (!expectedPricing) {
      // Hata halinde mesaj FARKLI: "yükleniyor" demek yanlış olurdu — sorgu
      // 4xx'te hiç, ağ hatasında `retry` tükendikten sonra kendiliğinden
      // tazelenmiyor (`refetchOnWindowFocus: false`); kullanıcı özet kartındaki
      // "Tekrar Dene" düğmesine basmalı.
      alertInlineWhileOtpOpen(
        quoteQuery.isError ? t('checkout.priceUnavailableTitle') : t('checkout.priceNotReadyTitle'),
        quoteQuery.isError
          ? t('checkout.priceUnavailableBody')
          : t('checkout.priceNotReadyBody'),
      );
      return null;
    }
    // Telefon kapısı — `setLoading(true)`'dan ÖNCE. ENGELLEYİCİ ama SONLANDIRICI
    // değil: kullanıcı numarayı düzeltip aynı OTP oturumuyla devam edebilir, o
    // yüzden modal açıkken satır içi basılır (modal kapatmak kodu boşa düşürürdü).
    const resolved = resolvePayloadPhones();
    if (!resolved.ok) {
      alertInlineWhileOtpOpen(t('checkout.phoneInvalidTitle'), resolved.message);
      return null;
    }
    return { expectedPricing, resolved };
  };

  /**
   * "Fiyat güncellendi, tekrar onaylayın" — 409 akışının uyarısı ile kapı
   * sonrası fiyat güvencesinin TEK kaynağı. Sipariş GÖNDERİLMEZ; kullanıcı yeni
   * toplamı görür ve düğmeye yeniden basarak onaylar.
   */
  const alertPricesChanged = (commission: boolean, oldTotal: ServerPrice, newTotal: ServerPrice) => {
    const totals = { oldTotal: formatServerPrice(oldTotal), newTotal: formatServerPrice(newTotal) };
    alertAfterOtpClose(
      commission ? t('checkout.commissionChangedTitle') : t('checkout.pricesUpdatedTitle'),
      commission
        ? t('checkout.commissionChangedBody', totals)
        : t('checkout.pricesUpdatedBody', totals),
    );
  };

  const proceedCheckout = async (emailVerificationCode?: string) => {
    if (loading) return;
    const ready = checkoutReadiness();
    if (!ready) return;
    const { expectedPricing, resolved } = ready;
    setLoading(true);
    try {
      const shipping = buildShippingPayload(resolved.phones);
      const billing = buildBillingPayload(resolved.phones);

      const { guestName, guestEmail } = readGuest();
      const checkoutPayload = {
        distanceSalesAccepted,
        // Quote ile AYNI satırlar (adet DAHİL) — farklı adet imzayı bozar → 409.
        items: toOrderLineItems(items),
        idempotencyKey: idempotencyKeyRef.current,
        shippingAddressId: shipping.id,
        shippingAddress: shipping.inline,
        billingAddressId: billing?.id,
        billingAddress: billing?.inline,
        // Quote'tan türetilmiş imza — dört alan gövdeye burada yayılır.
        expectedPricing,
        // Kupon yoksa alanı hiç göndermiyoruz (backend opsiyonel bekliyor).
        ...(coupon.couponCode ? { couponCode: coupon.couponCode } : {}),
      };

      const response =
        isAuthenticated && user
          ? await ordersApi.checkout(checkoutPayload)
          : await ordersApi.checkoutGuest({
              // Onay misafir yolunda da İLK çağrıda gider — yasal yükümlülük
              // üye/misafir ayrımı yapmıyor.
              distanceSalesAccepted,
              items: checkoutPayload.items,
              idempotencyKey: checkoutPayload.idempotencyKey,
              email: guestEmail.trim().toLowerCase(),
              emailVerificationCode: emailVerificationCode ?? '',
              // `resolvePayloadPhones` misafir dalında ÇÖZDÜ — boş geçemez.
              phone: requirePhone(resolved.phones.guest, getPhoneInvalidMessage()),
              guestName: guestName.trim(),
              shippingAddress: shipping.inline!,
              billingAddress: billing?.inline,
              expectedPricing,
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
          t('common.error'),
          t('checkout.orderCreatedPaymentFailed'),
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
          t('checkout.paymentStartFailedBody');
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
        alertAfterOtpClose(t('checkout.paymentStartFailedTitle'), msg, [
          { text: t('common.ok'), onPress: () => router.replace(isAuthenticated ? '/orders' : ('/' as any)) },
        ]);
      }
    } catch (error: any) {
      // Client-side telefon reddi ağ hatası DEĞİL: log'lanmaz (mesaj PII taşımaz
      // ama gürültü de yapmasın), Sentry'ye gitmez, kullanıcıya Türkçe basılır.
      if (error?.isClientValidation) {
        alertInlineWhileOtpOpen(t('checkout.phoneInvalidTitle'), error.message);
        return;
      }
      logger.error('Checkout error', { err: safeError(error) });
      captureException(error, { level: 'error', tags: { flow: 'checkout' }, extra: { status: error?.response?.status } });
      const status = error?.response?.status;
      // İki ayrı çakışma, TEK dal: fiyat/kargo değişti (i18nKey ile gelir) veya
      // komisyon seti değişti (delta 18 — `code` ile gelir). İkisinde de quote
      // yenilenir, yeni toplam gösterilir, yeniden onay istenir. Sessiz retry YOK.
      const isPricingConflict =
        status === 409 && error?.response?.data?.i18nKey === 'server.shipping.pricingChanged';
      const isCommissionConflict =
        status === 409 && error?.response?.data?.code === 'COMMISSION_PRICING_CHANGED';
      if (isPricingConflict || isCommissionConflict) {
        const oldTotal = total;
        const refreshed = await quoteQuery.refetch();
        const newTotal = refreshed.data?.pricing?.summary?.total;
        alertPricesChanged(isCommissionConflict, oldTotal, newTotal);
        return;
      }
      // 503: aktif komisyon kuralı yok. Yeniden quote'la ÇÖZÜLMEZ — kullanıcıyı
      // quote döngüsüne sokma, geçici platform hatası olarak bildir.
      if (status === 503) {
        alertAfterOtpClose(
          t('checkout.pricingUnavailableTitle'),
          t('checkout.pricingUnavailableBody'),
        );
        return;
      }
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (Array.isArray(error.response?.data?.message)
          ? error.response?.data?.message.join(', ')
          : t('checkout.orderCreateFailed'));
      const isStockout =
        (status === 400 || status === 409) &&
        typeof errorMessage === 'string' &&
        STOCKOUT_KEYWORDS.some((kw) => errorMessage.toLowerCase().includes(kw.toLowerCase()));
      if (!isAuthenticated && emailVerificationCode && status === 400 && !isStockout) {
        setOtpError(extractApiMessage(error) ?? t('checkout.verificationCodeInvalid'));
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
      alertInlineWhileOtpOpen(t('common.error'), typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  /** Satır kontrolleri (boş sepet, geçersiz `productId`). Sorun varsa uyarır, `false` döner. */
  const itemsReady = (): boolean => {
    if (items.length === 0) {
      toast.error(t('checkout.emptyCart'));
      return false;
    }
    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string' || item.productId.length < 10) {
        appAlert(t('common.error'), t('checkout.invalidProductId', { title: item.title }));
        return false;
      }
    }
    return true;
  };

  /**
   * Kullanıcının ONAYLADIĞI şey: fiyat imzası (dört alan) + satırlar (adet
   * dahil) + kupon. Kapıdan önce ve sonra bu anahtar karşılaştırılır.
   */
  const confirmedKey = (expectedPricing: ExpectedPricingSnapshot) =>
    JSON.stringify([expectedPricing, itemsSignature, coupon.couponCode ?? null]);
  const commissionKey = (p: ExpectedPricingSnapshot) =>
    `${p.expectedCommissionRuleSetId}:${p.expectedCommissionRuleSetVersion}`;

  /**
   * Kimlik kapısından SONRA, son commit'in değerleriyle çalışır (ref üzerinden).
   * Kapı dakikalarca açık kalabilir: bu sırada sepet boşalmış, satırlar ya da
   * quote değişmiş olabilir. Satır kontrolleri yeniden koşar; kullanıcının
   * basarken gördüğü tutar/satırlar değiştiyse sipariş GÖNDERİLMEZ — 409'daki
   * gibi yeni toplam gösterilir, yeniden onay (tekrar basış) beklenir. Hiçbir
   * şey değişmediyse GÜNCEL değerlerle (adres/telefon/onay kutusu) devam edilir.
   */
  const resumeAfterIdentity = async (pressed: { key: string; total: number | null; commissionKey: string }) => {
    if (!itemsReady()) return;
    if (loading) return;
    const ready = checkoutReadiness();
    if (!ready) return;
    if (confirmedKey(ready.expectedPricing) !== pressed.key) {
      alertPricesChanged(
        commissionKey(ready.expectedPricing) !== pressed.commissionKey,
        pressed.total,
        total,
      );
      return;
    }
    await proceedCheckout();
  };
  // Son commit'in fonksiyonu: `await` sonrası (kimlik kapısı) bayat closure
  // yerine. Atama `useLayoutEffect`'te (useEvent kalıbı), render'da değil.
  const resumeAfterIdentityRef = useLatestRef(resumeAfterIdentity);

  const handleCheckout = async () => {
    if (!itemsReady()) return;
    // Tek sayfa: adres/iletişim doğrulaması artık adım geçişinde değil burada.
    // Kimlik kapısından ve OTP kodu isteğinden ÖNCE — eksik formda kullanıcıya
    // ne kimlik ne e-posta kodu sorulur.
    const formErr = validateAddressForm();
    if (formErr) {
      toast.error(formErr);
      return;
    }
    if (isAuthenticated && user) {
      // B-2.4: yasal kimlik ihtiyaç anında. Vazgeçerse ödeme başlamaz. Misafir
      // dalında yok (hesap yok); OTP yolu da `proceedCheckout`'u çağırdığı için
      // kapı onun içinde değil, burada.
      // Önce ucuz yerel kontroller; basış anındaki tutar/satırlar saklanır ve
      // kapıdan sonra güncel değerlerle karşılaştırılır (`resumeAfterIdentity`).
      if (loading) return;
      const ready = checkoutReadiness();
      if (!ready) return;
      const pressed = {
        key: confirmedKey(ready.expectedPricing),
        total,
        commissionKey: commissionKey(ready.expectedPricing),
      };
      if (!(await requireIdentity())) return;
      await resumeAfterIdentityRef.current(pressed);
      return;
    }

    const { guestName, guestEmail, guestPhone, guestPhoneCountryCode } = readGuest();
    const guestErr = validateGuest(guestName, guestEmail, guestPhone, guestPhoneCountryCode);
    if (guestErr) {
      toast.error(guestErr);
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
      resetOtpCode();
      setOtpError(null);
      setOtpResendAt(Date.now() + expiresIn * 1000);
      setOtpEmail(email);
      setOtpModalOpen(true);
    } catch (e: any) {
      if (handleEmailAlreadyRegistered(e)) return;
      toast.error(extractApiMessage(e) ?? t('checkout.verificationCodeSendFailed'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    await proceedCheckout(otpCode);
  };

  const handleOtpResend = async () => {
    if (Date.now() < otpResendAt || otpSending) return;
    const email = readGuest().guestEmail.trim().toLowerCase();
    setOtpSending(true);
    try {
      const resp: any = await ordersApi.sendGuestVerificationCode({
        email,
        expectedCheckoutCount: Math.max(1, items.length),
      });
      const expiresIn = resp?.data?.data?.expiresInSeconds ?? resp?.data?.expiresInSeconds ?? 180;
      setOtpResendAt(Date.now() + expiresIn * 1000);
      resetOtpCode();
      setOtpError(null);
    } catch (e: any) {
      // `handleEmailAlreadyRegistered` modalı `closeOtpModal` üzerinden kapatır:
      // ham `setOtpModalOpen(false)` OTP kodunu/`otpError`'ı temizlemiyor ve
      // `pendingAlertRef`'i boşaltmıyordu → ertelenmiş bir uyarı askıda kalırdı.
      if (handleEmailAlreadyRegistered(e)) return;
      setOtpError(extractApiMessage(e) ?? t('checkout.codeSendFailed'));
    } finally {
      setOtpSending(false);
    }
  };

  // Memo'lu bölümlere giden geri çağrılar referans-kararlı.
  const { refetch: refetchQuote } = quoteQuery;
  const retryQuote = useCallback(() => {
    void refetchQuote();
  }, [refetchQuote]);
  const toggleDistanceSales = useCallback(() => setDistanceSalesAccepted((v) => !v), []);

  return {
    isAuthenticated,
    items,
    /** "Hemen Al" ile gelindi: yalnız tek ürün ödenir (web `buyNowNotice`). */
    isBuyNow,
    // guest — RHF formu (`CheckoutGuestFields`); değerler gönderimde `getValues()` ile okunur
    guestForm,
    // address
    selectedAddressId, setSelectedAddressId,
    shippingAddressStore, setShippingAddress,
    billingDifferent, setBillingDifferent,
    selectedBillingAddressId, setSelectedBillingAddressId,
    billingAddressStore, setBillingAddress,
    addresses,
    // shipping/pricing — hepsi `pricing.summary`'den AYNEN; sunucu değeri yoksa
    // `null` (yer tutucu basılır, yerel sayı uydurulmaz).
    shippingCost, shippingLoading,
    productAmount, serviceFeeAmount, total,
    quantityDiscount, feeDiscounts, feeDiscountTotal,
    /** Quote'un fiyatlayamadığı satırlar — bilgi amaçlı, hiçbir tutar hesabına girmez. */
    unavailableItems,
    /** Ödemeye giren satırlar = sepet − ayrılanlar. Özet listesi ve ürün sayacı BUNU kullanır. */
    payableItems,
    /** Ayrılan satırın adı (sepetten) — uyarı kartı hangi ürün olduğunu yazsın diye. */
    cartTitleFor,
    /** Satır tutarı — sunucunun `items[].subtotal`'ı; yoksa `null` (yer tutucu). */
    lineSubtotalFor,
    /** Satır adedi — tutarla AYNI kaynaktan; yoksa `null` (yerel adet basılır). */
    lineQuantityFor,
    quoteLoading: quoteQuery.isLoading,
    /** Quote hatası — ekran ErrorState + "Tekrar Dene" gösterir (src/ui/CLAUDE.md › Empty and error states). */
    quoteError: quoteQuery.isError,
    retryQuote,
    coupon,
    /** Sunucunun uyguladığı indirim (quote kökü) — rozet bilgisi, özet satırı değil. */
    couponDiscount,
    // ui — kimlik kontrolü sürerken de "işleniyor" (düğme devre dışı).
    loading: loading || checkingIdentity,
    handleCheckout,
    distanceSalesAccepted,
    toggleDistanceSales,
    // otp — kod ve geri sayım modalın içinde (bkz. `otpCodeResetSeq`, `otpResendAt`)
    otpModalOpen, otpCodeResetSeq, otpEmail, otpError, otpResendAt, otpSending,
    closeOtpModal, handleOtpSubmit, handleOtpResend,
  };
}
