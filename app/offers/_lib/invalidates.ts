import { qk } from '@/lib/query';

/**
 * Bir teklif mutation'ı başarılı olduğunda geçersiz kılınacak cache kümesi —
 * TEK kaynak. Tüm teklif mutation hook'ları `useAppMutation({ invalidates })`
 * ile bunu verir (manuel refetch yok). `detailAll`'lar = tekil `['offer', id]` / `['product', id]`
 * detayları (`offers.all` / `products.all` bunları yakalamaz).
 */
export const OFFER_INVALIDATES = [
  qk.offers.all,
  qk.offers.detailAll,
  qk.products.all,
  qk.products.detailAll,
  qk.products.searchAll,
  qk.products.myListingsAll,
] as const;
