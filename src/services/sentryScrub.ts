/**
 * Sentry olaylarından kişisel veri temizliği.
 *
 * Neden gerekli: axios hataları `config.data` alanında serileştirilmiş istek
 * gövdesini taşır — telefon, adres, e-posta, IBAN, hatta şifre. SDK yakaladığı
 * hatanın alanlarını olaya kopyaladığı için bunlar kayıt sunucusuna gidiyordu.
 *
 * İlke: **teşhis için gerekeni bırak, kimliği götüreni sil.** `requestId`,
 * `status`, `url`, `i18nKey` gibi alanlar hata ayıklamanın tamamı; onlar
 * kalmazsa temizlik körlük yaratır.
 */

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
  'data', // axios `config.data` — serileştirilmiş istek gövdesi
  'body',
]);

const PLACEHOLDER = '[scrubbed]';
const MAX_DEPTH = 8;

function scrubValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth > MAX_DEPTH) return PLACEHOLDER;
  // Döngüsel yapı: Sentry olayları iç içe referans taşıyabiliyor; sonsuz
  // özyinelemede rapor tamamen kaybolurdu.
  if (seen.has(value as object)) return PLACEHOLDER;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? PLACEHOLDER
      : scrubValue(entry, depth + 1, seen);
  }
  return result;
}

/**
 * Bir Sentry olayını yerinde değil, kopyalayarak temizler.
 * `null`/`undefined` aynen döner (SDK olayı düşürmek için `null` bekler).
 */
export function scrubEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event;
  return scrubValue(event, 0, new WeakSet()) as T;
}
