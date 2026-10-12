type StatusBody = { status?: string; data?: { status?: string } };

/** Yanıt gövdesindeki statü — düz (`{status}`) ya da zarflı (`{data:{status}}`) gelebilir. */
export function responseStatus(
  response: { data?: StatusBody } | null | undefined,
): string | undefined {
  return response?.data?.data?.status ?? response?.data?.status;
}

/**
 * İlan (yeniden) aktivasyonunda kullanıcıya gösterilecek mesaj anahtarı.
 *
 * API `PATCH /products/:id` ve `POST /products/:id/renew` yanıtındaki GERÇEK
 * statüye bakılır: çoğu ilan admin onayına (`pending`) gider, ama iade
 * karantinasındaki (`return_quarantine`) ilan ve içeriği değişmemiş süresi
 * dolmuş ilan doğrudan `active` olur. Statik "incelemeye gönderildi" ikinci
 * durumda yanlış olurdu. Web `useListingLifecycle` ile aynı ayrım.
 */
export function activationMessageKey(
  response: { data?: StatusBody } | null | undefined,
): "listing.reactivatedImmediately" | "listing.sentForReview" {
  return responseStatus(response) === "active"
    ? "listing.reactivatedImmediately"
    : "listing.sentForReview";
}

/**
 * Süresi dolan ilanın tek yenilemesinin mesajı (web `profile.expiredListings.*`):
 * yayına döndü ya da içeriği değiştiği için onaya düştü.
 */
export function renewMessageKey(
  response: { data?: StatusBody } | null | undefined,
): "profile.expiredListings.renewed" | "profile.expiredListings.submitted" {
  return responseStatus(response) === "active"
    ? "profile.expiredListings.renewed"
    : "profile.expiredListings.submitted";
}
