/**
 * Mutlak adres ayrıştırma — güvenlik kararlarının (kendi sitemiz mi, hangi ortam, 3DS dönüşü,
 * belge deposu, API adresi, dış link) TEK kapısı.
 *
 * Neden kendi ayrıştırıcımız: RN'in `URL` sınıfı WHATWG ayrıştırıcısı değil (regex tabanlı;
 * `origin`'e `user@` bilgisini katıyor, ters eğik çizgiyi normalize etmiyor). Her modülün kendi
 * regex'i ise ayrışıyordu: biri `https://x@staging.tarodan.com.tr`'nin host'unu `x@staging…`,
 * diğeri `staging…` okuyordu — production'daki staging engeli bu farktan atlatılabiliyordu.
 *
 * Kural (katı — şüpheli adres REDDEDİLİR, düzeltilmeye çalışılmaz):
 *  - şema `https:` (ya da açıkça izin verilirse `http:`), ardından `//`;
 *  - yetki bölümünde kullanıcı bilgisi (`@`), yüzde kodlaması, boşluk YOK; port yalnız şemanın
 *    varsayılanı (443 / 80, yazılmışsa atılır);
 *  - host: küçük harfe çevrilmiş DNS adı (harf, rakam, `-`, `.`); IP-v6 / boş etiket / sondaki
 *    nokta yok;
 *  - adresin hiçbir yerinde ters eğik çizgi ya da kontrol karakteri yok (tarayıcı `\`'yi `/`
 *    sayar: `https://iyi.com\@kötü.com`).
 */
export type ParsedUrl = {
  scheme: 'https' | 'http';
  /** Küçük harf, portsuz. */
  host: string;
  /** `/` ile başlar (boşsa `/`). */
  path: string;
  /** `?…` ya da boş. */
  search: string;
  /** `#…` ya da boş. */
  hash: string;
};

const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;
// eslint-disable-next-line no-control-regex
const FORBIDDEN_ANYWHERE = /[\\\u0000-\u001f\u007f]/;

export function parseStrictUrl(input: unknown, opts: { allowHttp?: boolean } = {}): ParsedUrl | null {
  if (typeof input !== 'string') return null;
  const url = input.trim();
  if (!url || FORBIDDEN_ANYWHERE.test(url)) return null;
  const m = /^(https?):\/\/(.*)$/i.exec(url);
  if (!m) return null;
  const scheme = m[1]!.toLowerCase() as ParsedUrl['scheme'];
  if (scheme === 'http' && !opts.allowHttp) return null;

  const rest = m[2]!;
  const end = rest.search(/[/?#]/);
  const authority = end === -1 ? rest : rest.slice(0, end);
  const tail = end === -1 ? '' : rest.slice(end);
  if (!authority || /[@%\s]/.test(authority)) return null;

  let host = authority.toLowerCase();
  const port = /:(\d*)$/.exec(host);
  if (port) {
    if (port[1] !== (scheme === 'https' ? '443' : '80')) return null;
    host = host.slice(0, -port[0].length);
  }
  if (!HOST.test(host)) return null;

  const hashAt = tail.indexOf('#');
  const beforeHash = hashAt === -1 ? tail : tail.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : tail.slice(hashAt);
  const queryAt = beforeHash.indexOf('?');
  const path = (queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)) || '/';
  const search = queryAt === -1 ? '' : beforeHash.slice(queryAt);
  return { scheme, host, path, search, hash };
}

/** Katı `https://` adresinin host'u; geçersizse `null`. */
export function strictHttpsHost(input: unknown): string | null {
  return parseStrictUrl(input)?.host ?? null;
}

/** Girdi mutlak `http(s)://` adresi gibi mi görünüyor (katı ayrıştırmadan bağımsız). */
export const looksAbsoluteHttpUrl = (input: unknown): boolean =>
  typeof input === 'string' && /^\s*https?:\/\//i.test(input);
