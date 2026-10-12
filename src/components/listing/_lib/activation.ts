/**
 * İlan (yeniden) aktivasyonu sonucu — İlanlarım ve düzenleme formu ortak.
 *
 * API `PATCH /products/:id` yanıtındaki GERÇEK statüye bakılır: çoğu ilan admin
 * onayına (`pending`) gider, ama iade karantinasındaki (`return_quarantine`)
 * ilan doğrudan `active` olur (`resolveUpdatedStatus`, apps/api). Statik
 * "incelemeye gönderildi" ikinci durumda yanlış olurdu. Web
 * `useListingLifecycle` ile aynı ayrım.
 *
 * Gövde şekli: API çıplak ürünü döndürür (`{ id, status, ... }`); kod
 * tabanındaki kalıba uyup `{ data: { ... } }` zarfını da kabul ederiz.
 */
type ActivationResponse = { data?: any } | null | undefined;

function resultStatus(response: ActivationResponse): string | undefined {
  const body = response?.data;
  const product = body?.data ?? body;
  return typeof product?.status === "string" ? product.status : undefined;
}

/** Aktivasyon isteğinden sonra ilanın GERÇEK statüsü (`active` değilse `pending`). */
export function activatedStatus(response: ActivationResponse): "active" | "pending" {
  return resultStatus(response) === "active" ? "active" : "pending";
}

export function activationMessageKey(
  response: ActivationResponse,
): "listing.reactivatedImmediately" | "listing.sentForReview" {
  return activatedStatus(response) === "active"
    ? "listing.reactivatedImmediately"
    : "listing.sentForReview";
}
