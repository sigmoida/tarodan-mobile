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

const SENTRY_RULES: ScrubRules = { redactKey: (k) => REDACTED_KEYS.has(k) };

/**
 * Bir Sentry olayını yerinde değil, kopyalayarak temizler.
 * `null`/`undefined` aynen döner (SDK olayı düşürmek için `null` bekler).
 */
export function scrubEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event;
  return scrubValue(event, 0, new WeakSet(), SENTRY_RULES) as T;
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
  return text
    .replace(BEARER, 'Bearer [scrubbed]')
    .replace(JWT, PLACEHOLDER)
    .replace(EMAIL, PLACEHOLDER)
    .replace(OPAQUE, (m) => (UUID.test(m) ? m : PLACEHOLDER));
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
