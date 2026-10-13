// Teklif KABUL akışı — TEK kaynak (web `offers/_hooks/useOffers.ts` + `OfferCard.tsx`).
// Liste kartı ve detay ekranı aynı onay metnini ve "ilk ödeyen alır" notunu buradan alır.
import type { MessageKey } from "@/i18n/lib";

/** Kabulü KİM yapıyor: satıcı gelen teklifi mi, alıcı karşı teklifi mi? */
export type AcceptAs = "seller" | "buyer";

/** Onay istenen geri alınamaz işlemler: kabul (satıcı / alıcı), reddet, iptal. */
export type OfferConfirmKind = "acceptSeller" | "acceptBuyer" | "reject" | "cancel";

/** Kabulün `AcceptAs` karşılığı. */
export const acceptKind = (as: AcceptAs): OfferConfirmKind =>
  as === "buyer" ? "acceptBuyer" : "acceptSeller";

/**
 * Onay diyaloğu metinleri (web `useOfferAction.run`). Kabul ürünü kilitlemediği için iki
 * taraf farklı uyarılır; reddet/iptal "geri alınamaz" ve yıkıcı düğmeyle sorulur.
 */
export const OFFER_CONFIRM: Record<
  OfferConfirmKind,
  { title: MessageKey; description: MessageKey; destructive: boolean; dismiss: MessageKey }
> = {
  acceptSeller: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescSeller", destructive: false, dismiss: "common.cancel" },
  acceptBuyer: { title: "offer.acceptConfirmTitle", description: "offer.acceptConfirmDescBuyer", destructive: false, dismiss: "common.cancel" },
  reject: { title: "offer.rejectConfirmTitle", description: "offer.rejectConfirmDesc", destructive: true, dismiss: "common.cancel" },
  // "İptal" bir İPTAL diyaloğunda belirsiz (neyi iptal?): web'in iptal diyalogları gibi "Vazgeç"
  // (`order.cancelConfirmNo`, web trade/üyelik iptali).
  cancel: { title: "offer.cancelConfirmTitle", description: "offer.cancelConfirmDesc", destructive: true, dismiss: "order.cancelConfirmNo" },
};

type OfferOrderState = { status?: string; orderStatus?: string | null };

/**
 * Kabul edilmiş ve siparişi ÖDEME BEKLEYEN teklif (`orderStatus === 'pending_payment'`).
 * Kartın "Öde" düğmesi ile "ilk ödeyen alır" notu AYNI kuraldan gider; iptal / süresi dolmuş /
 * henüz bilinmeyen sipariş durumunda ikisi de görünmez.
 */
export const isOfferAwaitingPayment = (offer: OfferOrderState): boolean =>
  offer.status === "accepted" && offer.orderStatus === "pending_payment";

/**
 * "İlk ödeyen alır" notu (web `OfferCard`): stok ancak ödemede rezerve edildiği için aynı
 * ürüne birden fazla kabul olabilir. Not yalnız ödeme beklenirken anlamlıdır.
 * (Web bunu `!paid` ile gösterir; iptal edilmiş siparişte de görünür; mobil sapma.)
 */
export const showFirstToPayNote = isOfferAwaitingPayment;
