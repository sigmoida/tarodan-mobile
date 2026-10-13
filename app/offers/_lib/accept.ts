// Teklif KABUL akışı — TEK kaynak (web `offers/_hooks/useOffers.ts` + `OfferCard.tsx`).
// Liste kartı ve detay ekranı aynı onay metnini ve "ilk ödeyen alır" notunu buradan alır.
import type { MessageKey } from "@/i18n/lib";

/** Kabulü KİM yapıyor: satıcı gelen teklifi mi, alıcı karşı teklifi mi? */
export type AcceptAs = "seller" | "buyer";

/** Kabul onay diyaloğu metin anahtarları. Kabul ürünü kilitlemediği için iki taraf farklı uyarılır. */
export const ACCEPT_CONFIRM_KEYS: Record<AcceptAs, { title: MessageKey; description: MessageKey }> = {
  seller: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescSeller" },
  buyer: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescBuyer" },
};

/** Ödemesi tamamlanmış sipariş durumları (web `PAID_ORDER_STATUSES`). */
const PAID_ORDER_STATUSES = ["paid", "preparing", "shipped", "delivered", "completed"];

export const isOfferOrderPaid = (offer: { status?: string; orderStatus?: string | null }): boolean =>
  offer.status === "accepted" && PAID_ORDER_STATUSES.includes(offer.orderStatus ?? "");

/**
 * Kabul edilmiş ama ÖDENMEMİŞ teklifte "ilk ödeyen alır" notu (web `OfferCard`):
 * stok ancak ödemede rezerve edildiği için aynı ürüne birden fazla kabul olabilir.
 */
export const showFirstToPayNote = (offer: { status?: string; orderStatus?: string | null }): boolean =>
  offer.status === "accepted" && !isOfferOrderPaid(offer);
