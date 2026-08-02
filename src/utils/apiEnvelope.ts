/**
 * API yanıt zarfı toleransı.
 *
 * Backend uçlarının bir kısmı gövdeyi doğrudan, bir kısmı `{ data: {...} }`
 * zarfıyla döndürüyor; kod tabanı bunu her çağrı yerinde
 * `(response.data as any)?.data ?? response.data` diye elle açıyor
 * (`useCheckout.proceedCheckout`, `useServerCart`, `addressesApi` okumaları…).
 * Quote çağrıları bu toleransı ATLIYORDU: uç bir gün zarfa geçerse
 * `pricing.summary` sessizce `undefined` olur, hiçbir tutar basılamaz ve checkout
 * kilitlenir.
 *
 * Bilerek `@/lib/api` dışında ve saf: 50'den fazla test `@/lib/api` barrel'ını
 * tümüyle mock'luyor; yardımcı orada yaşasaydı o mock'ların hepsinde
 * `undefined` olur, ekran testlerinde anlaşılmaz bir "not a function" üretirdi.
 */
export function unwrapEnvelope<T>(res: { data?: unknown } | null | undefined): T {
  const body = res?.data as { data?: unknown } | undefined;
  return (body?.data ?? body ?? {}) as T;
}
