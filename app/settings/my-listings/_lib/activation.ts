/**
 * İlan (yeniden) aktivasyonunda kullanıcıya gösterilecek mesaj anahtarı.
 *
 * API `PATCH /products/:id` yanıtındaki GERÇEK statüye bakılır: çoğu ilan admin
 * onayına (`pending`) gider, ama iade karantinasındaki (`return_quarantine`)
 * ilan doğrudan `active` olur (`resolveUpdatedStatus`, apps/api). Statik
 * "incelemeye gönderildi" ikinci durumda yanlış olurdu. Web
 * `useListingLifecycle` ile aynı ayrım.
 */
export function activationMessageKey(
  response: { data?: { status?: string } } | null | undefined,
): "listing.reactivatedImmediately" | "listing.sentForReview" {
  return response?.data?.status === "active"
    ? "listing.reactivatedImmediately"
    : "listing.sentForReview";
}
