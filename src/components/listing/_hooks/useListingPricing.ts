import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ListingFormController } from './useListingForm';
import type { ListingFormKey } from '../_lib/memoSection';
import { COMMISSION_DEBOUNCE_MS, useCommissionPreview, useCommissionQuery } from './useCommissionPreview';
import { commissionPreviewAmount, saleStartsLater } from '../_lib/sale';
import { priceFieldError, salePriceFieldError } from '../_lib/priceRules';

/**
 * `useListingPricing`'in okuduğu controller alanları — kullanan bölümün `memoSection` anahtarlarına
 * eklenir (bu alanlardan biri değişince bölüm yeniden çizilsin; `f.form` sabit referanstır).
 */
export const LISTING_PRICING_KEYS: readonly ListingFormKey[] = [
  'form',
  'priceLimits',
  'priceBaseline',
  'priceBlurred',
  'salePriceBlurred',
  'submitAttempted',
  'salePrice',
  'saleStartDate',
  'saleEndDate',
  'categoryId',
  'shippingPackageTier',
];

/**
 * Fiyat/adet'e bağlı türetmeler — YAPRAKTA (fiyat ve kargo kartları) hesaplanır.
 *
 * Fiyat ve adet controller'da (`useListingForm`) İZLENMEZ: tuş vuruşu yalnız bu hook'u kullanan
 * bölümleri yeniden çizer, 1000 satırlık controller'ı ve formun geri kalanını çalıştırmaz.
 * Fiyat hatası, indirim yüzdesi, ileri tarihli indirim ve komisyon önizlemesi buradan gelir.
 * Komisyon iki bölümde çağrılsa da aynı sorgu anahtarı → tek istek (React Query tekilleştirir).
 */
export function useListingPricing(f: ListingFormController) {
  const { t } = useTranslation();
  const [price = '', quantity = ''] = useWatch({ control: f.form.control, name: ['price', 'quantity'] });
  const saleFields = {
    price,
    salePrice: f.salePrice,
    saleStartDate: f.saleStartDate,
    saleEndDate: f.saleEndDate,
  };
  const showErrors = f.submitAttempted;
  const priceError =
    f.priceBlurred || showErrors
      ? priceFieldError(t, price, f.priceLimits, f.priceBaseline) ?? undefined
      : undefined;
  const salePriceError =
    f.salePriceBlurred || showErrors
      ? salePriceFieldError(t, saleFields, f.priceLimits, f.priceBaseline) ?? undefined
      : undefined;

  const listPriceNum = Number(price) || 0;
  const salePriceNum = Number(f.salePrice) || 0;
  const discountPercent =
    listPriceNum > 0 && salePriceNum > 0 && salePriceNum < listPriceNum
      ? Math.round((1 - salePriceNum / listPriceNum) * 100)
      : 0;

  // Komisyon önizlemesi — indirim BUGÜN geçerliyse indirimli fiyattan sorulur.
  const commission = useCommissionPreview(
    commissionPreviewAmount(saleFields),
    f.categoryId,
    f.shippingPackageTier,
  );

  return {
    price,
    quantity,
    priceError,
    salePriceError,
    discountPercent,
    saleStartsOn: saleStartsLater(saleFields),
    ...commission,
  };
}

export type ListingPricing = ReturnType<typeof useListingPricing>;

/** `useListingCommission`'ın okuduğu controller alanları (kargo bölümünün memo anahtarları). */
export const LISTING_COMMISSION_KEYS: readonly ListingFormKey[] = [
  'form',
  'salePrice',
  'saleStartDate',
  'saleEndDate',
  'categoryId',
  'shippingPackageTier',
];

/**
 * YALNIZ komisyon önizlemesi — kargo bölümü için dar hook. Fiyat `useWatch` ile DEĞİL, RHF
 * aboneliğiyle (render etmeden) izlenir; tutar `COMMISSION_DEBOUNCE_MS` sessizlikten sonra
 * state'e yazılır. Böylece fiyat yazmak / alanı terk etmek / gönderim denemesi kargo bölümünü
 * yeniden çizmez; yalnız (gecikmeli) tutar değişince bir kez çizilir. Sorgu fiyat kartıyla
 * AYNI anahtarda (`useCommissionQuery`) → tek istek.
 */
export function useListingCommission(f: ListingFormController) {
  const { form, salePrice, saleStartDate, saleEndDate } = f;
  const [amount, setAmount] = useState(() =>
    commissionPreviewAmount({ price: form.getValues('price') ?? '', salePrice, saleStartDate, saleEndDate }),
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () =>
      setAmount(
        commissionPreviewAmount({
          price: form.getValues('price') ?? '',
          salePrice,
          saleStartDate,
          saleEndDate,
        }),
      );
    // İndirim alanları değişti (ya da ilk kurulum): hemen.
    update();
    const sub = form.watch((_values, { name }) => {
      // `name` yok = reset (düzenleme ön dolumu) → o da tutarı değiştirir.
      if (name && name !== 'price') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, COMMISSION_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [form, salePrice, saleStartDate, saleEndDate]);

  return useCommissionQuery(amount, f.categoryId, f.shippingPackageTier);
}
