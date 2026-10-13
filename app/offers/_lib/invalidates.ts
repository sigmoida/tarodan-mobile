import { qk } from '@/lib/query';

/**
 * Bir teklif mutation'ı başarılı olduğunda geçersiz kılınacak cache kümesi —
 * TEK kaynak. Tüm teklif mutation hook'ları `useAppMutation({ invalidates })`
 * ile bunu verir (manuel refetch yok). `detailAll` = tekil `['product', id]` detayları
 * (`products.all` bunları yakalamaz).
 */
export const OFFER_INVALIDATES = [
  qk.offers.all,
  qk.products.all,
  qk.products.detailAll,
  qk.products.listingsAll,
  qk.products.myListingsAll,
] as const;
