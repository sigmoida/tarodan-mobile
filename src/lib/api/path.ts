/**
 * API yol segmenti doğrulama + kodlama — `src/lib/api/*` yollarının TEK kapısı.
 *
 * Sorun: expo-router parametreleri (derin bağlantı, push, bildirim linki) doğrudan
 * şablon yollara giriyordu: `api.post(\`/trades/${id}/accept\`)`. Router parametreyi
 * ÇÖZÜLMÜŞ verir; `x/../../offers/<id>/accept?` gibi bir kimlik isteği başka bir
 * uca (başka bir mutasyona) yönlendirebiliyordu.
 *
 * Kural: yola giren her değişken `apiPath` etiketli şablonla yazılır; her
 * interpolasyon `seg()`'den geçer:
 *   1. DOĞRULAMA — izin listesi: harf/rakam (Unicode) ve `_ . ~ : @ -`; `.`/`..`,
 *      boş değer, `/`, `\`, `%`, `?`, `#`, boşluk, kontrol karakteri REDDEDİLİR.
 *      Yalnız kodlamak yetmez: ters vekil (nginx `proxy_pass` URI'li) `%2F`/`%2E`'yi
 *      çözüp yolu normalize edebilir — şüpheli değer hiç yola girmemeli.
 *   2. KODLAMA — `encodeURIComponent` (izin listesindeki Unicode harfler için).
 *
 * Geçersiz değer FIRLATMAZ: yerine sabit `INVALID_PATH_SEGMENT` konur ve istek o
 * zararsız yola gider (sunucu 404/400 → çağıranın normal hata yolu). Fırlatmak,
 * `api.x(...).catch()` ile sarılmış ateşle-unut çağrılarda (gösterim/tık sayacı)
 * yakalanmayan senkron bir hataya dönüşürdü.
 *
 * Sorgu parametreleri bu kapıdan geçmez — onlar axios `params` ile gider.
 * Denetim: `tarodan/encoded-api-path` lint kuralı (eslint-plugin-tarodan).
 */

/** Geçersiz segmentin yerine konan, hiçbir gerçek kaynağa denk gelmeyen sabit. */
export const INVALID_PATH_SEGMENT = '__invalid-path-segment__';

const SAFE_SEGMENT_RE = /^[\p{L}\p{N}_.~:@-]{1,256}$/u;

/** Önceden doğrulanmış çok segmentli yol (ör. depolama key'i) — yalnız `keyPath()` üretir. */
export interface EncodedPath {
  readonly __encodedPath: string;
}

/** Değer tek bir güvenli yol segmenti mi? */
export function isSafePathSegment(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  return value !== '.' && value !== '..' && SAFE_SEGMENT_RE.test(value);
}

/** Tek yol segmenti: doğrula + `encodeURIComponent`; geçersizse `INVALID_PATH_SEGMENT`. */
export function seg(value: string | number): string {
  return isSafePathSegment(value) ? encodeURIComponent(String(value)) : INVALID_PATH_SEGMENT;
}

/**
 * `/` içeren depolama key'i (sunucu ucu `file/*` joker): her parça ayrı ayrı `seg()`'den
 * geçer — `/` korunur, `..`/boş parça geçersiz sayılır.
 */
export function keyPath(key: string): EncodedPath {
  const parts = typeof key === 'string' && key ? key.split('/') : [''];
  return { __encodedPath: parts.map(seg).join('/') };
}

function isEncodedPath(v: unknown): v is EncodedPath {
  return typeof v === 'object' && v !== null && typeof (v as EncodedPath).__encodedPath === 'string';
}

/**
 * Etiketli şablon: sabit parçalar olduğu gibi kalır, HER interpolasyon `seg()`'den
 * geçer (ya da `keyPath()` sonucu ise olduğu gibi eklenir).
 *
 *   api.post(apiPath`/trades/${id}/accept`)
 */
export function apiPath(
  strings: TemplateStringsArray,
  ...values: Array<string | number | EncodedPath>
): string {
  let out = strings[0] ?? '';
  values.forEach((v, i) => {
    out += (isEncodedPath(v) ? v.__encodedPath : seg(v)) + (strings[i + 1] ?? '');
  });
  return out;
}
