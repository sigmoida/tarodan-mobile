import { deepLinkConfig } from '@/lib/deeplinks';
import { ownWebHosts } from '@/lib/web';
import { parseStrictUrl } from '@/lib/security/url';

/**
 * 3D Secure dönüşü — WebView'in vardığı adres BİZİM ödeme dönüş adresimiz mi?
 *
 * PayTR, 3DS bitince tarayıcıyı sunucunun verdiği `merchant_ok_url` /
 * `merchant_fail_url`'e yönlendirir: `${FRONTEND_URL}/payment/success[?…]` ve
 * `${FRONTEND_URL}/payment/fail` (API `paytr.service.ts`). Eskiden adreste
 * `/payment/success` ALT DİZESİ aranıyordu: banka/3DS sayfasından ya da araya giren
 * bir sayfadan `https://saldirgan.example/payment/success` (veya
 * `https://x.example/?r=/payment/success`) yönlendirmesi "başarılı" sayılıyordu.
 *
 * Kural (katı):
 *  - şema `https:`, host bu ortamın KENDİ web alan adlarından biri (`ownWebHosts`, production'da
 *    staging yok); kullanıcı bilgisi (`user@`), port (443 dışı), ters eğik çizgi, yüzde
 *    kodlaması host'ta yok;
 *  - yol TAM OLARAK `/payment/success`, `/payment/fail` ya da `/payment/failure` (isteğe bağlı
 *    yayınlanan locale öneki `/en` ve sondaki `/`); sorgu/parça serbest.
 *
 * Ayrıştırma ortak katı ayrıştırıcıyla (`@/lib/security/url` — RN `URL` WHATWG değil).
 *
 * ⚠️ `success` SONUCU TEK BAŞINA ÖDEMEYİ KANITLAMAZ: çağıran (CardPaymentForm) başarıyı ancak
 * sunucudaki ödeme durumu "ödendi" ise gösterir. Bu eşleşme yalnız o doğrulamayı tetikler.
 */
export type ThreeDSCallbackResult = 'success' | 'fail' | null;

const localePrefixes = () =>
  deepLinkConfig.locales.filter((l) => l !== deepLinkConfig.defaultLocale);

function callbackKind(path: string): ThreeDSCallbackResult {
  let p = path.replace(/\/+$/, '') || '/';
  for (const l of localePrefixes()) {
    if (p.startsWith(`/${l}/`)) {
      p = p.slice(l.length + 1);
      break;
    }
  }
  if (p === '/payment/success') return 'success';
  if (p === '/payment/fail' || p === '/payment/failure') return 'fail';
  return null;
}

export function threeDSCallbackResult(
  url: string | null | undefined,
  hosts: ReadonlySet<string> = ownWebHosts(),
): ThreeDSCallbackResult {
  const parsed = parseStrictUrl(url);
  if (!parsed || !hosts.has(parsed.host)) return null;
  return callbackKind(parsed.path);
}
