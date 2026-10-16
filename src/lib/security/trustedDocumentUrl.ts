import { resolveApiBaseUrl } from '@/lib/api/baseUrl';
import { ownWebHosts } from '@/lib/web';
import { parseStrictUrl, strictHttpsHost } from './url';

/**
 * Sunucunun verdiği belge adresi (fatura / e-Arşiv PDF'i) dışarıda AÇILMADAN önce doğrulanır.
 *
 * Adres API yanıtından geliyor (`{ url }`): sunucu tarafında bir hata ya da araya giren biri
 * `javascript:`, `intent:`, özel şema, düz `http://` ya da oltalama sitesi verirse
 * `Linking.openURL` onu sorgusuz açardı. Kural:
 *  - katı `https://` (`parseStrictUrl`: kullanıcı bilgisi, varsayılan dışı port, `\` yok);
 *  - host izin listesinde: belge deposu (S3 — web `imageHosts.ts` / `next.config.js` ile aynı
 *    sunucular; yol-stili adreste yalnız bizim kova), `EXPO_PUBLIC_S3_PUBLIC_BASE_URL`'in host'u,
 *    API'nin kendi host'u ve bu ortamın web alan adları (`ownWebHosts`).
 */

/** Belge deposu: kova-host (sanal-host stili) adresi. */
const STORAGE_BUCKET_HOST = 'amzn-tarodan.s3.eu-west-1.amazonaws.com';
/** Bölge host'u (yol-stili adres): yalnız bizim kovanın yolu kabul edilir. */
const STORAGE_REGION_HOST = 's3.eu-west-1.amazonaws.com';
const STORAGE_BUCKET_PATH = '/amzn-tarodan/';

function trustedHosts(): Set<string> {
  const hosts = new Set<string>([STORAGE_BUCKET_HOST, ...ownWebHosts()]);
  const apiHost = strictHttpsHost(resolveApiBaseUrl());
  if (apiHost) hosts.add(apiHost);
  const s3Public = strictHttpsHost(process.env.EXPO_PUBLIC_S3_PUBLIC_BASE_URL);
  if (s3Public) hosts.add(s3Public);
  return hosts;
}

/** Belge adresi dışarıda (tarayıcı / PDF görüntüleyici) açılabilir mi. */
export function isTrustedDocumentUrl(url: unknown): url is string {
  const parsed = parseStrictUrl(url);
  if (!parsed) return false;
  if (parsed.host === STORAGE_REGION_HOST) {
    // Yol-stili: yalnız bizim kova; `..` / kodlanmış nokta-eğik çizgi ile başka kovaya kaçış yok
    // (tarayıcı `..`'yu çözüp `/<başka-kova>/` yapardı).
    const { path } = parsed;
    return path.startsWith(STORAGE_BUCKET_PATH) && !/(^|\/)\.\.?(\/|$)|%2e|%2f|%5c/i.test(path);
  }
  return trustedHosts().has(parsed.host);
}
