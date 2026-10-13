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
 * confirm-failed istekleri `withPaymentCapability` sarmalayıcısından geçer ve
 * başlığı TEK yerden alır.
 *
 * Web belirteci sekme ömürlü `sessionStorage`'da tutar; mobilde karşılığı süreç
 * ömrü (bellek). Uygulama kapanırsa misafir ödemeye dönemez — web'de sekme
 * kapanınca olduğu gibi. Belirteç kalıcı depoya yazılmaz.
 */
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
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

/** `/payments/:id/<uç>` yolundaki ödeme id'si. */
const PAYMENT_ID_IN_PATH = /^\/payments\/([^/?#]+)\/[^/?#]+/;

/**
 * İsteğin yetkilendirdiği ödeme: yoldaki `:id` (`/payments/:id/status`, `verify`,
 * `confirm-failed`…), yoksa gövdedeki `paymentId` (`/payments/direct-form`).
 */
export function capabilityPaymentId(url: string, body?: unknown): string | undefined {
  const fromPath = PAYMENT_ID_IN_PATH.exec(url)?.[1];
  if (fromPath) return fromPath;
  const fromBody = (body as { paymentId?: unknown } | null | undefined)?.paymentId;
  return typeof fromBody === 'string' && fromBody ? fromBody : undefined;
}

type HttpClient = Pick<AxiosInstance, 'get' | 'post'>;

/**
 * Ödeme API'sine özel istek sarmalayıcısı: axios `get`/`post` imzasıyla aynı,
 * ama isteğin ödemesi için saklı belirteç varsa `X-Payment-Capability`
 * başlığını kendisi ekler (yoksa başlık eklenmez — üye kendi oturumuyla
 * yetkili). Belirteç başka ödemeye sızmaz: başlık yalnız id'si eşleşen ödemeye.
 *
 * Genel axios interceptor'ı yerine bilerek ayrı sarmalayıcı: yalnız buradan
 * geçen ödeme uçları etkilenir, diğer isteklerin yolu değişmez.
 */
export function withPaymentCapability(client: HttpClient): HttpClient {
  const configFor = async (
    url: string,
    body: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosRequestConfig> => ({
    ...config,
    headers: {
      ...(config?.headers as Record<string, string> | undefined),
      ...(await paymentCapabilityHeaders(capabilityPaymentId(url, body))),
    },
  });
  return {
    get: async (url, config) => client.get(url, await configFor(url, undefined, config)),
    post: async (url, data, config) => client.post(url, data, await configFor(url, data, config)),
  };
}

/** Yalnız testler için. */
export function __resetPaymentCapabilities(): void {
  tokens.clear();
}
