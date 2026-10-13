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
 * başlığı TEK yerden alır (ödeme id'si çağırandan açıkça gelir).
 *
 * Saklama: web belirteci `sessionStorage` + bellek kopyasında tutar. Mobilde
 * banka uygulamasına (3DS) geçişte OS uygulamanın JS sürecini öldürebiliyor;
 * yalnız bellek yetmez. Belirteç `payment-capability.<paymentId>` anahtarıyla
 * (web anahtarıyla aynı) AsyncStorage'a da yazılır, sunucudaki ömrüyle aynı
 * 2 saat TTL ile. Okurken süresi dolan silinir ve yok sayılır. Her AsyncStorage
 * erişimi try/catch içinde: depo yoksa ya da hata verirse yalnız bellek kopyası
 * kullanılır (akış aynı süreçte yine tamamlanır).
 */
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/** Sunucudaki belirteç ömrü: `payment.controller.ts` → `issuePaymentCapability` (`expiresIn: "2h"`). */
export const PAYMENT_CAPABILITY_TTL_MS = 2 * 60 * 60 * 1000;

/** AsyncStorage anahtarı — web `sessionStorage` anahtarıyla aynı. */
const storageKey = (paymentId: string) => `payment-capability.${paymentId}`;

type Entry = { token: string; expiresAt: number };

type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

/**
 * Bellek önbelleği. `null` = bu süreçte depoya bakıldı, kayıt yok: durum
 * yoklaması her turda depoya gitmesin. Depoya yalnız bu modül yazar ve her
 * yazımda belleği de günceller; bu yüzden önbellek bayatlamaz.
 */
const memory = new Map<string, Entry | null>();

let storage: KeyValueStore | null | undefined;

/**
 * AsyncStorage ilk kullanımda yüklenir. Native modül yoksa paket import anında
 * fırlatır (mock'suz Jest, bozuk kurulum); statik import bu hatayı bütün
 * `@/lib/api` barrel'ına taşırdı. Yüklenemezse yalnız bellek kullanılır.
 */
function persistentStorage(): KeyValueStore | null {
  if (storage === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-async-storage/async-storage');
      storage = (mod?.default ?? mod ?? null) as KeyValueStore | null;
    } catch {
      storage = null;
    }
  }
  return storage;
}

function parseEntry(raw: string | null): Entry | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Entry> | null;
    return typeof value?.token === 'string' && typeof value.expiresAt === 'number'
      ? { token: value.token, expiresAt: value.expiresAt }
      : null;
  } catch {
    return null;
  }
}

async function removeStored(paymentId: string): Promise<void> {
  try {
    await persistentStorage()?.removeItem(storageKey(paymentId));
  } catch {
    /* silinemedi: sonraki okumada süresi dolduğu için yine yok sayılır */
  }
}

/** Bellekte yoksa depodan yükle (uygulama yeniden başlamış olabilir). */
async function hydrate(paymentId: string): Promise<void> {
  const store = persistentStorage();
  if (!store) return;
  let raw: string | null;
  try {
    raw = await store.getItem(storageKey(paymentId));
  } catch {
    return; // okunamadı: yalnız bellek, sonraki istek yeniden dener
  }
  // Beklerken aynı ödeme için yeni belirteç geldiyse onu ezme.
  if (memory.has(paymentId)) return;
  const entry = parseEntry(raw);
  memory.set(paymentId, entry);
  if (raw && !entry) await removeStored(paymentId); // bozuk kayıt
}

async function readCapability(paymentId: string): Promise<string | null> {
  if (!memory.has(paymentId)) await hydrate(paymentId);
  const entry = memory.get(paymentId);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) return entry.token;
  // Süresi doldu: sunucu da reddeder. Sil ve yok say.
  memory.set(paymentId, null);
  await removeStored(paymentId);
  return null;
}

type InitiateBody = { paymentId?: unknown; paymentAccessToken?: unknown };

/**
 * Başlatma yanıtında belirteç varsa sakla (`{ data }` zarfı da olur). Bellek
 * kopyası senkron yazılır (aynı süreçteki sonraki istekler depoyu beklemez);
 * dönen söz yalnız depo yazımını bekler. Hiç fırlatmaz.
 */
export async function rememberPaymentCapability(response: unknown): Promise<void> {
  const data = unwrapEnvelope<InitiateBody>(response as { data?: unknown } | null | undefined);
  if (typeof data.paymentId !== 'string' || typeof data.paymentAccessToken !== 'string') return;
  const entry: Entry = { token: data.paymentAccessToken, expiresAt: Date.now() + PAYMENT_CAPABILITY_TTL_MS };
  memory.set(data.paymentId, entry);
  try {
    await persistentStorage()?.setItem(storageKey(data.paymentId), JSON.stringify(entry));
  } catch {
    /* depo yazılamadı: yalnız bellek (web'de sessionStorage hatasında olduğu gibi) */
  }
}

/** Bu ödemenin yetki başlığı; belirteç yoksa boş (üye, kendi oturumuyla yetkili). Hiç fırlatmaz. */
export async function paymentCapabilityHeaders(
  paymentId: string | undefined | null,
): Promise<Record<string, string>> {
  if (!paymentId) return {};
  try {
    const token = await readCapability(paymentId);
    return token ? { 'X-Payment-Capability': token } : {};
  } catch {
    return {};
  }
}

type HttpClient = Pick<AxiosInstance, 'get' | 'post'>;

/**
 * Ödeme API'sine özel istek sarmalayıcısı: `paymentHttp(paymentId).get/post(...)`.
 * Dönen istemci axios `get`/`post` imzasıyla aynı, ama verilen ödeme için saklı
 * belirteç varsa `X-Payment-Capability` başlığını kendisi ekler (yoksa başlık
 * eklenmez — üye kendi oturumuyla yetkili).
 *
 * Ödeme id'sini çağıran AÇIKÇA verir; URL'den ya da gövdeden çıkarılmaz. Böylece
 * yeni bir uç yolu farklı biçimde olsa da belirteç yanlış ödemeye gitmez ya da
 * sessizce düşmez. Belirteç başka ödemeye sızmaz: başlık yalnız verilen ödemenin.
 *
 * Genel axios interceptor'ı yerine bilerek ayrı sarmalayıcı: yalnız buradan
 * geçen ödeme uçları etkilenir, diğer isteklerin yolu değişmez.
 */
export function withPaymentCapability(
  client: HttpClient,
): (paymentId: string | undefined | null) => HttpClient {
  return (paymentId) => {
    const withHeader = async (config?: AxiosRequestConfig): Promise<AxiosRequestConfig> => ({
      ...config,
      headers: {
        ...(config?.headers as Record<string, string> | undefined),
        ...(await paymentCapabilityHeaders(paymentId)),
      },
    });
    return {
      get: async (url, config) => client.get(url, await withHeader(config)),
      post: async (url, data, config) => client.post(url, data, await withHeader(config)),
    };
  };
}

/**
 * Yalnız testler için: bellek kopyasını ve depo bağlantısını sıfırlar
 * (AsyncStorage içeriğine dokunmaz — "uygulama yeniden başladı" benzetimi).
 */
export function __resetPaymentCapabilities(): void {
  memory.clear();
  storage = undefined;
}
