/**
 * Ödeme yetki belirteci (payment capability) — web `lib/api/payments.ts` aynası.
 *
 * `POST /payments/initiate[-guest]` yanıtı `paymentAccessToken` döner: yalnız o
 * ödemeye bağlı, kısa ömürlü (bugün 2 saat) bir JWT. Oturumu olmayan (misafir) istemci
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
 * (web anahtarıyla aynı) AsyncStorage'a da yazılır. Kayıt ömrü belirtecin
 * kendi JWT `exp`'inden gelir (`capabilityLifetimeMs`). Okurken süresi dolan
 * silinir ve yok sayılır. Her AsyncStorage erişimi try/catch içinde: depo yoksa
 * ya da hata verirse yalnız bellek kopyası kullanılır (akış aynı süreçte yine
 * tamamlanır).
 *
 * Temizlik: ödeme kesinleşince (ödendi, iade, iptal) kayıt silinir
 * (`forgetPaymentCapabilityIfFinal`, sonuç ekranları + iptal). `failed` kesin
 * değil: "Tekrar Dene" aynı ödemeyi aynı belirteçle yeniden açar. Kullanıcının
 * KENDİ çıkışında tüm `payment-capability.*` kayıtları silinir
 * (`clearAllPaymentCapabilities`, `resetUserStores('user')`): ortak cihazda A'nın
 * belirteci B'nin oturumunda kalmaz. Zorunlu çıkışta (401) silinmez — süren
 * ödeme (3DS) belirteciyle sonuçlanabilsin; başka bir hesapla girişte silinir
 * (`bindPaymentCapabilitiesToAccount`). Açılışta süresi dolmuş kayıtlar
 * süpürülür (`sweepExpiredPaymentCapabilities`).
 */
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { isFinalPaymentStatus } from './status';

/**
 * Yedek ömür: JWT `exp` okunamazsa. Sunucudaki ömürle aynı
 * (`payment.controller.ts` → `issuePaymentCapability`, `expiresIn: "2h"`).
 */
export const PAYMENT_CAPABILITY_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Belirteç, yanıt bize ulaşmadan en fazla bu kadar önce imzalanmış olabilir
 * (`client.ts` istek zaman aşımı 30 sn). Ömürden düşülür: kayıt `exp`'ten uzun
 * yaşamaz.
 */
export const ISSUE_LATENCY_MARGIN_MS = 30_000;

/**
 * Cihaz saati kayıt anından bu kadardan fazla GERİ alındıysa geçen süre
 * bilinemez; kayıt `exp`'ten uzun yaşamasın diye düşürülür. Küçük NTP
 * düzeltmeleri bu payın içinde kalır.
 */
export const CLOCK_ROLLBACK_TOLERANCE_MS = 60_000;

/** AsyncStorage anahtarı — web `sessionStorage` anahtarıyla aynı. */
const KEY_PREFIX = 'payment-capability.';
const storageKey = (paymentId: string) => `${KEY_PREFIX}${paymentId}`;
/**
 * Saklı belirteçlerin ait olduğu hesap. Önek dışında (`-owner`): süpürme ve
 * belirteç taraması bu anahtarı belirteç sanmaz.
 */
const OWNER_KEY = 'payment-capability-owner';

/** `storedAt`: kayıt anı (cihaz saati); saat geri alınmasını yakalamak için. */
type Entry = { token: string; expiresAt: number; storedAt?: number };

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64url → bayt dizisi (Latin-1 string). Kütüphanesiz; geçersizse `null`. */
function decodeBase64Url(input: string): string | null {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of input.replace(/-/g, '+').replace(/_/g, '/')) {
    if (ch === '=') break;
    const value = BASE64.indexOf(ch);
    if (value < 0) return null;
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

/** JWT gövdesindeki `exp`/`iat` (saniye). İmza DOĞRULANMAZ: yalnız ömrü okumak için. */
function readJwtTimes(token: string): { exp?: unknown; iat?: unknown } | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  const json = decodeBase64Url(payload);
  if (!json) return null;
  try {
    const claims = JSON.parse(json) as unknown;
    return claims && typeof claims === 'object' ? (claims as { exp?: unknown; iat?: unknown }) : null;
  } catch {
    return null;
  }
}

const isEpochSeconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Belirtecin bu cihazda saklanacağı süre (ms), kendi JWT `exp`'inden:
 *  - `exp` ve `iat` varsa `exp − iat`. İkisi de sunucu saatinde olduğu için cihaz
 *    saati ileri/geri olsa da ömür doğru kalır (mutlak `exp`'i cihaz saatiyle
 *    kıyaslamak, saati ileri cihazda taze belirteci "dolmuş" sayardı).
 *  - Yalnız `exp` varsa `exp − şimdi`, en fazla 2 saat.
 *  - `exp` okunamazsa 2 saat.
 * İmzadan yanıta geçen süre için `ISSUE_LATENCY_MARGIN_MS` düşülür. Sonuç ≤ 0 ise
 * belirteç zaten dolmuştur.
 */
export function capabilityLifetimeMs(token: string, now: number = Date.now()): number {
  const times = readJwtTimes(token);
  if (times && isEpochSeconds(times.exp)) {
    if (isEpochSeconds(times.iat)) return (times.exp - times.iat) * 1000 - ISSUE_LATENCY_MARGIN_MS;
    return Math.min(times.exp * 1000 - now, PAYMENT_CAPABILITY_TTL_MS);
  }
  return PAYMENT_CAPABILITY_TTL_MS - ISSUE_LATENCY_MARGIN_MS;
}

/** Kayıt hâlâ geçerli mi: süresi dolmadı ve saat kayıt anından öteye geri alınmadı. */
function isLive(entry: Entry, now: number): boolean {
  if (now >= entry.expiresAt) return false;
  return entry.storedAt === undefined || now >= entry.storedAt - CLOCK_ROLLBACK_TOLERANCE_MS;
}

type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiRemove(keys: readonly string[]): Promise<unknown>;
};

/**
 * Bellek önbelleği. `null` = bu süreçte depoya bakıldı, kayıt yok: durum
 * yoklaması her turda depoya gitmesin. Depoya yalnız bu modül yazar ve her
 * yazımda belleği de günceller; bu yüzden önbellek bayatlamaz.
 */
const memory = new Map<string, Entry | null>();

let storage: KeyValueStore | null | undefined;

/**
 * Çıkışta artar: o ana kadar uçuşta olan depo okuması belleğe, depo yazımı
 * depoya kapanan oturumun belirtecini geri getirmesin.
 */
let generation = 0;
/** Süren toplu silme: bu sırada depodan okuma yapılmaz (silinmekte olanı geri yükler). */
let clearing: Promise<void> | null = null;
/**
 * Son çıkış anı (bu süreçte). Depodan silme başarısız olsa bile bu andan önce
 * yazılmış kayıt bu süreçte belleğe yüklenmez.
 */
let clearedAt: number | null = null;
/** Belirteçlerin hesabı (bellek kopyası). `undefined` = bu süreçte depodan okunmadı. */
let owner: string | null | undefined;

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
    if (typeof value?.token !== 'string' || typeof value.expiresAt !== 'number') return null;
    return typeof value.storedAt === 'number'
      ? { token: value.token, expiresAt: value.expiresAt, storedAt: value.storedAt }
      : { token: value.token, expiresAt: value.expiresAt };
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
  if (clearing) await clearing;
  const startedIn = generation;
  let raw: string | null;
  try {
    raw = await store.getItem(storageKey(paymentId));
  } catch {
    return; // okunamadı: yalnız bellek, sonraki istek yeniden dener
  }
  // Beklerken çıkış yapıldıysa okunan kayıt kapanan oturuma ait; ya da aynı
  // ödeme için yeni belirteç geldiyse onu ezme.
  if (startedIn !== generation || memory.has(paymentId)) return;
  const parsed = parseEntry(raw);
  const writtenBeforeLogout = clearedAt !== null && (parsed?.storedAt ?? -Infinity) <= clearedAt;
  const entry = writtenBeforeLogout ? null : parsed;
  memory.set(paymentId, entry);
  if (raw && !entry) await removeStored(paymentId); // bozuk kayıt
}

async function readCapability(paymentId: string): Promise<string | null> {
  if (!memory.has(paymentId)) await hydrate(paymentId);
  const entry = memory.get(paymentId);
  if (!entry) return null;
  if (isLive(entry, Date.now())) return entry.token;
  // Süresi doldu (ya da saat geri alındı): sunucu da reddeder. Sil ve yok say.
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
  const now = Date.now();
  const lifetime = capabilityLifetimeMs(data.paymentAccessToken, now);
  if (lifetime <= 0) return; // zaten dolmuş: sunucu reddeder, saklama
  const entry: Entry = { token: data.paymentAccessToken, expiresAt: now + lifetime, storedAt: now };
  memory.set(data.paymentId, entry);
  const startedIn = generation;
  try {
    await persistentStorage()?.setItem(storageKey(data.paymentId), JSON.stringify(entry));
    // Yazım sürerken çıkış yapıldı: belirteç kapanan oturuma ait, depoda bırakma.
    if (startedIn !== generation) await removeStored(data.paymentId);
  } catch {
    /* depo yazılamadı: yalnız bellek (web'de sessionStorage hatasında olduğu gibi) */
  }
}

/** Ödeme kesinleşti (ödendi, iade, iptal): bu ödemenin kaydını sil. Hiç fırlatmaz. */
export async function forgetPaymentCapability(paymentId: string | undefined | null): Promise<void> {
  if (!paymentId) return;
  memory.set(paymentId, null);
  await removeStored(paymentId);
}

/**
 * Sonuç ekranları durumu okuduktan SONRA çağırır: durum kesinse
 * (`FINAL_PAYMENT_STATUSES`, `./status`) kaydı siler, değilse dokunmaz. Kart
 * formu çağırmaz: belirteç başarı/başarısız ekranının durum okuması ve
 * confirm-failed için hâlâ gerekli. Hiç fırlatmaz.
 */
export async function forgetPaymentCapabilityIfFinal(
  paymentId: string | undefined | null,
  status: unknown,
): Promise<void> {
  if (isFinalPaymentStatus(status)) await forgetPaymentCapability(paymentId);
}

async function storedCapabilityKeys(store: KeyValueStore): Promise<string[]> {
  return (await store.getAllKeys()).filter((key) => key.startsWith(KEY_PREFIX));
}

/**
 * Kullanıcının kendi çıkışı ya da hesap değişimi: tüm `payment-capability.*`
 * kayıtlarını (ve hesap işaretini) sil. Ortak cihazda A'nın belirteci B'nin
 * oturumunda kalmasın. Bellek senkron temizlenir (çağıran beklemese de sonraki
 * istek başlıksız gider); depo silinene kadar depodan okuma yapılmaz. Hiç
 * fırlatmaz.
 */
export function clearAllPaymentCapabilities(): Promise<void> {
  generation += 1;
  clearedAt = Date.now();
  memory.clear();
  owner = null;
  const store = persistentStorage();
  if (!store) return Promise.resolve();
  const run = (async () => {
    try {
      const keys = await storedCapabilityKeys(store);
      await store.multiRemove([...keys, OWNER_KEY]);
    } catch {
      /* silinemedi: okunduğunda süresi dolan yine yok sayılır; sonraki açılış süpürür */
    }
  })();
  const done = run.then(() => {
    if (clearing === done) clearing = null;
  });
  clearing = done;
  return done;
}

/**
 * Girişte (ve açılışta oturum yüklenince) çağrılır: saklı belirteçler başka bir
 * hesaba aitse hepsini sil, sonra bu hesabı işaretle.
 *
 * Neden: zorunlu çıkış (401) belirteçleri silmez — 3DS sürerken başka bir
 * isteğin 401'i süren ödemeyi düşürmesin; aynı kullanıcı yeniden girince
 * ödeme belirteciyle sonuçlanır. Ama ortak cihazda başka biri girerse önceki
 * hesabın belirteçleri onun oturumunda kalmamalı. İşaret yoksa (kullanıcı
 * kendi çıkışını yaptı ya da hiç giriş olmadı) mevcut kayıtlar misafir
 * akışındandır ve dokunulmaz. Hiç fırlatmaz.
 */
export async function bindPaymentCapabilitiesToAccount(accountId: string | null | undefined): Promise<void> {
  if (!accountId) return;
  const store = persistentStorage();
  let previous = owner;
  if (previous === undefined) {
    try {
      previous = (await store?.getItem(OWNER_KEY)) ?? null;
    } catch {
      previous = null;
    }
  }
  if (previous && previous !== accountId) await clearAllPaymentCapabilities();
  owner = accountId;
  try {
    await store?.setItem(OWNER_KEY, accountId);
  } catch {
    /* yazılamadı: bu süreçte bellek kopyası yeter */
  }
}

/**
 * Açılış: süresi dolmuş, bozuk ya da saati geri alınmış kayıtları sil
 * (okunmayan eski ödemelerin kayıtları birikmesin). Geçerli kayda dokunmaz:
 * banka uygulamasından dönüşte süren ödeme belirtecini kullanmaya devam eder.
 * Hiç fırlatmaz.
 */
export async function sweepExpiredPaymentCapabilities(now: number = Date.now()): Promise<void> {
  const store = persistentStorage();
  if (!store) return;
  try {
    const keys = await storedCapabilityKeys(store);
    if (keys.length === 0) return;
    const stale = (await store.multiGet(keys))
      .filter(([, raw]) => {
        const entry = parseEntry(raw);
        return !entry || !isLive(entry, now);
      })
      .map(([key]) => key);
    if (stale.length > 0) await store.multiRemove(stale);
  } catch {
    /* süpürülemedi: okunduğunda yine yok sayılır */
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
  clearing = null;
  clearedAt = null;
  owner = undefined;
}
