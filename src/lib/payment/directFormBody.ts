/**
 * `POST /payments/direct-form` gövdesi — tek üretici (para akışı; birim testli).
 *
 * Gövdeye kart verisi KOYULMAZ (sunucu `assertNoRawCardData` ile reddeder); kart
 * alanları yalnız WebView'in PayTR'ye POST ettiği HTML'e eklenir.
 */
/**
 * Ödeme hedefi — TEK tip: ödeme ekranı (`paymentTargetOf`), `CardPaymentForm`
 * ve direct-form gövdesi bunu kullanır (web `PaymentTarget`).
 */
export type DirectFormTarget = { orderId?: string; checkoutGroupId?: string; tradeId?: string };

export type DirectFormBody = DirectFormTarget & {
  paymentId?: string;
  savedCardId?: string;
  saveCard?: boolean;
  /**
   * Alıcı bu ödeme ekranında mesafeli satış sözleşmesini onayladı mı (API delta 22 §3).
   * Teklif siparişinin checkout adımı yok: onayın sunucuya ulaştığı TEK yer burası.
   */
  distanceSalesAccepted?: boolean;
};

export type DirectFormCard =
  /** Yeni kart: `save` = kart saklama açık VE kullanıcı "kartımı sakla" dedi. */
  | { kind: 'new'; save: boolean }
  | { kind: 'saved'; id: string };

export function buildDirectFormBody(input: {
  target: DirectFormTarget;
  /**
   * Ödenecek kayıt (web `useCardPayment`: `paymentId: resolved.paymentId`). Misafir
   * için zorunlu: sunucu `X-Payment-Capability` belirtecini bu id'ye karşı doğrular.
   */
  paymentId?: string;
  card: DirectFormCard;
  /** Onay kutusu bu ekranda gösterildiyse durumu; gösterilmediyse `undefined` (alan gönderilmez). */
  distanceSalesAccepted?: boolean;
}): DirectFormBody {
  const { target, paymentId, card, distanceSalesAccepted } = input;
  return {
    ...target,
    ...(paymentId ? { paymentId } : {}),
    // `saveCard` yeni kartta HER ZAMAN açıkça gider: gönderilmezse sunucu üyelikte kartı saklar.
    ...(card.kind === 'new' ? { saveCard: card.save } : { savedCardId: card.id }),
    ...(distanceSalesAccepted !== undefined ? { distanceSalesAccepted } : {}),
  };
}
