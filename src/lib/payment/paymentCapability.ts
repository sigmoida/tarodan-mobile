/**
 * Ödeme yetki belirteci (payment capability) — web `lib/api/payments.ts` aynası.
 *
 * `POST /payments/initiate[-guest]` yanıtı `paymentAccessToken` döner: yalnız o
 * ödemeye bağlı, 2 saat geçerli bir JWT. Oturumu olmayan (misafir) istemci
 * public ödeme uçlarında kendini bununla yetkilendirir: `X-Payment-Capability`
 * başlığı + gövdede `paymentId`. Sunucu misafirde ikisini de ister
 * (`payment-initiation.service.ts` → `resolveDirectPaymentContext`); biri
 * eksikse direct-form ve durum uçları `403 server.payment.viewStatusForbidden`.
 *
 * Akış: checkout `initiateGroupGuest` → belirteç burada saklanır →
 * `/payment/[id]?guest=1` → durum sorgusu, direct-form, verify ve
 * confirm-failed başlığı buradan okur.
 *
 * Web belirteci sekme ömürlü `sessionStorage`'da tutar; mobilde karşılığı süreç
 * ömrü (bellek). Uygulama kapanırsa misafir ödemeye dönemez — web'de sekme
 * kapanınca olduğu gibi. Belirteç kalıcı depoya yazılmaz.
 */
import { unwrapEnvelope } from '@/utils/apiEnvelope';

const tokens = new Map<string, string>();

type InitiateBody = { paymentId?: unknown; paymentAccessToken?: unknown };

/** Başlatma yanıtında belirteç varsa sakla (`{ data }` zarfı da olur). */
export function rememberPaymentCapability(response: unknown): void {
  const data = unwrapEnvelope<InitiateBody>(response as { data?: unknown } | null | undefined);
  if (typeof data.paymentId === 'string' && typeof data.paymentAccessToken === 'string') {
    tokens.set(data.paymentId, data.paymentAccessToken);
  }
}

/** Bu ödemenin yetki başlığı; belirteç yoksa boş (üye, kendi oturumuyla yetkili). */
export function paymentCapabilityHeaders(paymentId: string | undefined | null): Record<string, string> {
  const token = paymentId ? tokens.get(paymentId) : undefined;
  return token ? { 'X-Payment-Capability': token } : {};
}

/** Yalnız testler için. */
export function __resetPaymentCapabilities(): void {
  tokens.clear();
}
