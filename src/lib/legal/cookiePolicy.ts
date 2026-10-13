import { ownWebPageUrl } from '@/lib/ads/openAdLink';

/**
 * Çerez politikasının TEK kaynağı web sayfasıdır (`apps/web` `(legal)/cookies`):
 * mobil kendi kopyasını tutmaz, sayfayı uygulama içi web ekranında açar.
 * Web `localePrefix: "as-needed"` — varsayılan dil (tr) öneksiz, İngilizce `/en`.
 */
export function cookiePolicyUrl(language: string | null | undefined): string {
  const prefix = language?.toLowerCase().startsWith('en') ? '/en' : '';
  return ownWebPageUrl(`${prefix}/cookies`);
}
