import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, type CommissionPreviewResponse, type ShippingPackageTierCode } from '@/lib/api';
import { qk } from '@/lib/query';

import type { CommissionPreview } from '../_lib/types';

/** Yazarken her tuşta istek atılmasın diye tutar için kısa gecikme. */
export const COMMISSION_DEBOUNCE_MS = 400;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function toCommissionPreview(data: CommissionPreviewResponse | null | undefined): CommissionPreview {
  return {
    sellerFeeAmount: Number(data?.sellerFeeAmount ?? 0),
    withholdingTaxAmount: Number(data?.withholdingTaxAmount ?? 0),
    shippingAmount: Number(data?.shippingAmount ?? 0),
    sellerNetAmount: Number(data?.sellerNetAmount ?? 0),
    packageTierShipping: (data?.packageTierShipping ?? []).map((tier) => ({
      code: tier.code,
      sellerShippingAmount: Number(tier.sellerShippingAmount ?? 0),
    })),
  };
}

/**
 * İlan formunun komisyon / hak ediş önizlemesi (web `useCommissionPreview`).
 *
 * `amount` indirim-duyarlı tutardır (bkz. `_lib/sale.commissionPreviewAmount`).
 * Yalnız fiyat > 0 VE kategori seçiliyken sorulur — "henüz sormadık" (`enabled`
 * false) ile "sunucu veremedi" (`isError`) ayrı durumlar; form ikisine farklı
 * mesaj gösterir. Kademe seçilmemişse alan hiç gönderilmez (sunucu `small`
 * varsayar; istemci uydurmaz). Önceki veri tutulur: kademe değişince kartların
 * tutarları "…"ya düşüp aynı sayılara geri dönmesin.
 */
export function useCommissionPreview(amount: string, categoryId: string, packageTier: string) {
  return useCommissionQuery(useDebounced(amount, COMMISSION_DEBOUNCE_MS), categoryId, packageTier);
}

/**
 * Gecikmesi ÇAĞIRANDA yapılmış tutarla komisyon sorgusu (aynı anahtar → `useCommissionPreview` ile
 * tek istek). Kargo bölümü fiyatı render etmeden izler ve tutarı kendisi geciktirir
 * (`useListingCommission`).
 */
export function useCommissionQuery(debouncedAmount: string, categoryId: string, packageTier: string) {
  const num = Number(debouncedAmount);
  const enabled = !!debouncedAmount && !!categoryId && Number.isFinite(num) && num > 0;
  const tier = (packageTier || null) as ShippingPackageTierCode | null;

  const query = useQuery({
    queryKey: qk.orders.commissionPreview(debouncedAmount, categoryId, tier),
    queryFn: async () => {
      const res = await ordersApi.getCommissionPreview({
        amount: num,
        categoryId,
        packageTier: tier ?? undefined,
      });
      return toCommissionPreview(res.data);
    },
    enabled,
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous,
  });

  return {
    commissionPreview: enabled ? (query.data ?? null) : null,
    commissionLoading: enabled && query.isLoading,
    commissionError: enabled && query.isError,
    /** Önizleme istenebilir mi (fiyat + kategori girildi mi). */
    commissionEnabled: enabled,
  };
}
