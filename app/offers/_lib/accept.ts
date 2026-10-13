// Teklif KABUL akışı — TEK kaynak (web `offers/_hooks/useOffers.ts` + `OfferCard.tsx`).
// Liste kartı ve detay ekranı aynı onay metnini ve "ilk ödeyen alır" notunu buradan alır.
import type { MessageKey } from "@/i18n/lib";

/** Kabulü KİM yapıyor: satıcı gelen teklifi mi, alıcı karşı teklifi mi? */
export type AcceptAs = "seller" | "buyer";

/** Onay istenen geri alınamaz işlemler (şimdilik kabul: satıcı / alıcı). */
export type OfferConfirmKind = "acceptSeller" | "acceptBuyer";

/** Kabulün `AcceptAs` karşılığı. */
export const acceptKind = (as: AcceptAs): OfferConfirmKind =>
  as === "buyer" ? "acceptBuyer" : "acceptSeller";

/**
 * Onay diyaloğu metinleri (web `useOfferAction.run`). Kabul ürünü kilitlemediği için iki
 * taraf farklı uyarılır.
 */
export const OFFER_CONFIRM: Record<
  OfferConfirmKind,
  { title: MessageKey; description: MessageKey; destructive: boolean }
> = {
  acceptSeller: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescSeller", destructive: false },
  acceptBuyer: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescBuyer", destructive: false },
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
