import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { PaymentPurpose } from './capabilities';
import { unwrapSavedCards } from './savedCards';

/**
 * Kayıtlı kartlar — tek query hook (ödeme formu + Kayıtlı Kartlarım).
 *
 * - `purpose` verilirse yalnız o PayTR mağazasının kartları istenir (API delta 20)
 *   ve istemci de süzer: başka mağazanın kartı seçilirse direct-form
 *   `404 server.payment.savedCardNotFound` verir (eski API `purpose` döndürmez →
 *   kart olduğu gibi kalır). Amaçsız: iki mağaza birlikte.
 * - `staleTime: 0`: az önce saklanan kart sonraki ödemede hemen görünsün (genel
 *   5 dk önbellek burada yanlış seçim demek).
 * - `retry: false`: liste en iyi çaba; hata olursa form beklemeden yeni kartla
 *   devam eder (eski elle yazılmış akışla aynı).
 *
 * Kart silme `qk.payments.savedCardsAll` ile her amacın listesini tazeler.
 */
export function useSavedCards({ purpose, enabled = true }: { purpose?: PaymentPurpose; enabled?: boolean }) {
  return useQuery({
    queryKey: qk.payments.savedCards(purpose),
    queryFn: async () => {
      const res = purpose ? await membershipApi.listCards(purpose) : await membershipApi.listCards();
      const cards = unwrapSavedCards(res.data);
      return purpose ? cards.filter((c) => !c.purpose || c.purpose === purpose) : cards;
    },
    enabled,
    staleTime: 0,
    retry: false,
  });
}
