/**
 * Kişisel veri temizliği — TEK kaynak: Sentry olayları (`scrubEvent`, `services/sentryScrub`
 * buradan re-export eder) ve release konsol günlüğü (`scrubForConsole`, `ConsoleSink`) aynı
 * anahtar listesini (`REDACTED_KEYS`) kullanır; konsol ayrıca daha sıkıdır (aşağıya bak).
 *
 * Neden gerekli: axios hataları `config.data` alanında serileştirilmiş istek
 * gövdesini taşır — telefon, adres, e-posta, IBAN, hatta şifre. SDK yakaladığı
 * hatanın alanlarını olaya kopyaladığı için bunlar kayıt sunucusuna gidiyordu.
 *
 * İlke: **teşhis için gerekeni bırak, kimliği götüreni sil.** `requestId`,
 * `status`, `url`, `i18nKey` gibi alanlar hata ayıklamanın tamamı; onlar
 * kalmazsa temizlik körlük yaratır.
 */

import { safeError } from './safe-error';

/** Anahtar adı bunlardan biriyse değer tümüyle atılır (büyük/küçük harf fark etmez). */
const REDACTED_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'phone',
  'contactphone',
  'email',
  'companyemail',
  'kepaddress',
  'iban',
  'address',
  'companyaddress',
  'fullname',
  'authorizedfullname',
  'guestname',
  'taxid',
  // Yasal kimlik (B-2.4): GET/POST /legal-identity/me yanıtı ve gövdesi,
  // banka hesabının eski `tcKimlikNo` alanı. Maskeli numara da kimliği daraltır.
  'nationalid',
  'suggestednationalid',
  'nationalidmasked',
  'legalfirstname',
  'legallastname',
  'tckimlikno',
  // Ödeme: misafir ödeme yetki belirteci (gövde + `X-Payment-Capability` başlığı), PayTR
  // imzalı form alanları / 3DS HTML'i ve kart alanları (asla buraya gelmemeli; gelirse de gitmesin).
  'paymentaccesstoken',
  'x-payment-capability',
  'paytr_token',
  'merchant_key',
  'merchant_salt',
  'threedshtml',
  'threedsdata',
  'htmlcontent',
  'checkoutformcontent',
  'paymentpagecontent',
  'card_number',
  'cardnumber',
  'cc_owner',
  'cvv',
  'cvc',
  'expiry_month',
  'expiry_year',
  // Doğrulama kodları ve 2FA sırları (OTP, TOTP, yedek kodlar, otpauth adresi).
  'otp',
  'otpcode',
  'smscode',
  'verificationcode',
  'twofactorcode',
  'totp',
  'secret',
  'otpauthurl',
  'qrcode',
  'qrcodeurl',
  'backupcode',
  'backupcodes',
  'recoverycodes',
  'data', // axios `config.data` — serileştirilmiş istek gövdesi
  'body',
]);

const PLACEHOLDER = '[scrubbed]';
const MAX_DEPTH = 8;

interface ScrubRules {
  /** true ise anahtarın değeri tümüyle atılır. */
  redactKey: (lowerKey: string) => boolean;
  /** Verilirse, yaprak değerler (string) bununla süzülür; nesne için bir şey döndürürse değiştirir. */
  mapValue?: (value: unknown) => unknown;
}

function scrubValue(value: unknown, depth: number, seen: WeakSet<object>, rules: ScrubRules): unknown {
  if (value === null || typeof value !== 'object') {
    return rules.mapValue ? rules.mapValue(value) : value;
  }
  if (depth > MAX_DEPTH) return PLACEHOLDER;
  // Döngüsel yapı: Sentry olayları iç içe referans taşıyabiliyor; sonsuz
  // özyinelemede rapor tamamen kaybolurdu.
  if (seen.has(value as object)) return PLACEHOLDER;
  seen.add(value as object);

  if (rules.mapValue) {
    const mapped = rules.mapValue(value);
    if (mapped !== value) return mapped;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, depth + 1, seen, rules));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = rules.redactKey(key.toLowerCase())
      ? PLACEHOLDER
      : scrubValue(entry, depth + 1, seen, rules);
  }
  return result;
}

/**
 * Sentry'de ADI bunlardan birini içeren anahtar da atılır (`accessToken`, `pushToken`,
 * `x-api-key`, `set-cookie`, `clientSecret`...). `email`/`phone` gibi kimlik alanları zaten
 * `REDACTED_KEYS`'te; burada yalnız kimlik bilgisi/sır taşıyan ad kalıpları var — teşhis
 * alanlarına (`requestId`, `status`, `url`, `i18nKey`, `code`) dokunulmaz.
 */
const SENTRY_SENSITIVE_KEY = /token|secret|passw|authorization|cookie|api-?key|api_key|credential/i;

const SENTRY_RULES: ScrubRules = {
  redactKey: (k) => REDACTED_KEYS.has(k) || SENTRY_SENSITIVE_KEY.test(k),
  // Olay metinleri (hata mesajı, breadcrumb mesajı, http/navigasyon adresi) içindeki
  // Bearer / JWT / e-posta ve adres sorgusundaki sırlar maskelenir. Opak-dizi kuralı
  // (konsoldaki `OPAQUE`) burada YOK: yığın izindeki dosya adlarını/hash'leri bozardı.
  mapValue: (v) => (typeof v === 'string' ? scrubSentryString(v) : v),
};

/**
 * Bir Sentry olayını (hata, işlem) yerinde değil, kopyalayarak temizler.
 * `null`/`undefined` aynen döner (SDK olayı düşürmek için `null` bekler).
 *
 * Kullanıcı bağlamı (`user`) yalnız `id`'ye indirilir: e-posta, kullanıcı adı ve IP gitmez.
 * Olaya iliştirilen breadcrumb'lar `scrubBreadcrumb` kuralıyla temizlenir.
 */
export function scrubEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event;
  const { breadcrumbs, ...rest } = event as T & { breadcrumbs?: unknown };
  const cleaned = scrubValue(rest, 0, new WeakSet(), SENTRY_RULES) as Record<string, unknown>;
  if (cleaned.user && typeof cleaned.user === 'object') {
    cleaned.user = sentryUser(cleaned.user as { id?: unknown });
  }
  if (Array.isArray(breadcrumbs)) cleaned.breadcrumbs = breadcrumbs.map((b) => scrubBreadcrumb(b));
  else if (breadcrumbs !== undefined) cleaned.breadcrumbs = PLACEHOLDER;
  return cleaned as T;
}

/**
 * Ağ ve gezinme breadcrumb'larının `data`'sı yapılandırılmış teşhis verisidir (`url`, `method`,
 * `status_code`, `from`/`to`): axios gövdesi gibi tümüyle atılmaz, İÇİ temizlenir (anahtar
 * kuralları + adres sorgusundaki sırlar). Diğer kategorilerde (console vb.) `data` atılır —
 * rastgele argüman taşıyabilir.
 */
const STRUCTURED_BREADCRUMB_CATEGORIES = new Set(['xhr', 'fetch', 'http', 'navigation']);

/** Tek bir breadcrumb'ı kopyalayarak temizler (`beforeBreadcrumb` ve olaydaki liste). */
export function scrubBreadcrumb<T>(crumb: T): T {
  if (!crumb || typeof crumb !== 'object') return crumb;
  const { data, ...rest } = crumb as T & { data?: unknown; category?: unknown };
  const cleaned = scrubValue(rest, 0, new WeakSet(), SENTRY_RULES) as Record<string, unknown>;
  if (data === undefined) return cleaned as T;
  const structured =
    typeof rest.category === 'string' && STRUCTURED_BREADCRUMB_CATEGORIES.has(rest.category);
  cleaned.data =
    structured && typeof data === 'object' && data !== null && !Array.isArray(data)
      ? scrubValue(data, 1, new WeakSet(), SENTRY_RULES)
      : PLACEHOLDER;
  return cleaned as T;
}

/** Sentry'ye giden kullanıcı: yalnız kimlik (e-posta / kullanıcı adı / IP asla). */
export function sentryUser(user: { id?: unknown } | null | undefined): { id: string } | null {
  const id = user?.id;
  return typeof id === 'string' || typeof id === 'number' ? { id: String(id) } : null;
}

// ---------------------------------------------------------------------------
// Adres (URL) sırları
// ---------------------------------------------------------------------------

/**
 * Sorgu/parça parametresinin ADI bunu içeriyorsa değeri maskelenir: e-posta doğrulama /
 * şifre sıfırlama / davet linklerindeki `token`, OAuth `code`/`state`, OTP, imzalı S3
 * adreslerindeki `X-Amz-Signature`/`X-Amz-Credential`/`X-Amz-Security-Token`, misafir sipariş
 * takibindeki `email`, ban ekranının `reason`'ı...
 */
const SENSITIVE_PARAM =
  /token|secret|passw|otp|code|(?:^|[-_.])key$|apikey|signature|^sig$|auth|session|^state$|hash|credential|email|phone|iban|tckn|nationalid|reason/i;
/** `?ad=değer` / `&ad=değer` / `#ad=değer` / `;ad=değer`. */
const URL_PARAM = /([?&#;])([^=&#?\s"'<>]+)=([^&#\s"'<>]*)/g;
/** Adı masum olsa da değeri opak bir sırra benzeyen parametre (24+ karakterlik belirteç). */
const OPAQUE_PARAM_VALUE = /^[A-Za-z0-9._~%+/=-]{24,}$/;

/** Metindeki adres sorgularında sır taşıyan parametre değerlerini maskeler. */
export function scrubUrlSecrets(text: string): string {
  if (!text.includes('=')) return text;
  return text.replace(URL_PARAM, (match, sep: string, name: string, value: string) => {
    if (!value) return match;
    let decodedName = name;
    try {
      decodedName = decodeURIComponent(name);
    } catch {
      /* bozuk kodlama: adı olduğu gibi değerlendir */
    }
    const sensitive =
      SENSITIVE_PARAM.test(decodedName) || (OPAQUE_PARAM_VALUE.test(value) && !UUID.test(value));
    return sensitive ? `${sep}${name}=${PLACEHOLDER}` : match;
  });
}

/** Sentry metin temizliği: Bearer / JWT / e-posta + adres sorgusundaki sırlar. */
function scrubSentryString(text: string): string {
  return scrubUrlSecrets(
    text.replace(BEARER, 'Bearer [scrubbed]').replace(JWT, PLACEHOLDER).replace(EMAIL, PLACEHOLDER),
  );
}

// ---------------------------------------------------------------------------
// Release konsol günlüğü
// ---------------------------------------------------------------------------

/**
 * Konsolda Sentry'den SIKI: ham HTTP nesneleri (`response`, `request`, `config`, `headers`,
 * `data`) teşhis amaçlı bile basılmaz (Sentry'de `status`/`url` korunur; konsolda bunlar
 * `safeError` özetinde zaten var), ve ad olarak token/parola/e-posta/IBAN/telefon geçen
 * her anahtar (`pushToken`, `fcmToken`...) atılır.
 */
const CONSOLE_REDACTED_KEYS = new Set(['response', 'request', 'config', 'headers', 'data', 'body']);
const SENSITIVE_KEY = /token|secret|password|passwd|authorization|cookie|iban|e-?mail|phone|apikey/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g;
// 32+ karakterlik opak dizi (token, anahtar, hash); UUID kimlik olduğu için korunur.
// (Açgözlü eşleşme çalışmanın en uzununu alır; lookbehind gerekmez, Hermes'te de güvenli.)
const OPAQUE = /[A-Za-z0-9_-]{32,}/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dizideki e-posta / Bearer / JWT / opak token benzeri değerleri maskeler. */
export function scrubString(text: string): string {
  return scrubUrlSecrets(
    text
      .replace(BEARER, 'Bearer [scrubbed]')
      .replace(JWT, PLACEHOLDER)
      .replace(EMAIL, PLACEHOLDER)
      .replace(OPAQUE, (m) => (UUID.test(m) ? m : PLACEHOLDER)),
  );
}

const looksLikeError = (v: unknown): boolean =>
  v instanceof Error ||
  (v !== null &&
    typeof v === 'object' &&
    ('isAxiosError' in v || ('config' in v && 'response' in v)));

const CONSOLE_RULES: ScrubRules = {
  redactKey: (k) => REDACTED_KEYS.has(k) || CONSOLE_REDACTED_KEYS.has(k) || SENSITIVE_KEY.test(k),
  mapValue: (v) => {
    if (typeof v === 'string') return scrubString(v);
    if (v instanceof Date) return v.toISOString();
    if (looksLikeError(v)) {
      const e = safeError(v);
      return { ...e, message: scrubString(e.message) };
    }
    return v;
  },
};

/**
 * Release konsoluna yazılacak değeri özyinelemeli temizler: hata benzeri nesneler `safeError`
 * özetine döner, hassas anahtarlar atılır, string değerlerdeki e-posta / Bearer / JWT / opak
 * token maskelenir. Girdiyi değiştirmez (kopya döner).
 */
export function scrubForConsole<T>(value: T): T {
  return scrubValue(value, 0, new WeakSet(), CONSOLE_RULES) as T;
}
