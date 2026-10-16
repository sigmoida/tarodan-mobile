import { stripLocalePrefix } from '@/lib/deeplinks';
import { ownWebPageUrl } from '@/lib/web';

/**
 * Uygulamada kalan yasal belgeler — TEK kaynak. Her biri mobilde AYNI adlı bir
 * rotadır (`app/terms.tsx` …) ve web'in "uygulama modu" sayfasını
 * (`/app/<doc>`; başlık/altbilgi/çerez bandı yok, noindex) WebView'de açar.
 * Metin artık mobilde kopyalanmaz: yeniden-onay kapısı üyeden web'deki
 * yürürlükteki sürümü onaylamasını ister, gösterilen de odur.
 *
 * Onay kapısı muafiyeti (`isLegalTextPath`) ve onay ekranlarındaki bağlantılar
 * (`legalRouteFor`) bu listeden türer (`@/lib/shared/legalConsent`).
 */
export const LEGAL_WEB_DOCS = [
  'terms',
  'privacy',
  'distance-sales',
  'cookies',
  'seller-agreement',
  'refund-policy',
] as const;

export type LegalWebDoc = (typeof LEGAL_WEB_DOCS)[number];

/** Ekran başlığı — onay akışlarının da kullandığı `legal.*Title` anahtarları. */
export const LEGAL_WEB_DOC_TITLE_KEYS = {
  terms: 'legal.termsTitle',
  privacy: 'legal.privacyTitle',
  'distance-sales': 'legal.distanceSalesTitle',
  cookies: 'legal.cookiesTitle',
  'seller-agreement': 'legal.sellerAgreementTitle',
  'refund-policy': 'legal.refundPolicyTitle',
} as const satisfies Record<LegalWebDoc, string>;

/**
 * Web next-intl `as-needed`: Türkçe öneksiz, İngilizce `/en`. Uygulama dili
 * (i18next) İngilizce değilse Türkçe sayfa açılır.
 */
function localePrefix(lang: string | null | undefined): string {
  return lang?.toLowerCase().startsWith('en') ? '/en' : '';
}

/** WebView'de açılan uygulama modu adresi: `/app/<doc>` ya da `/en/app/<doc>`. */
export function legalEmbedUrl(doc: LegalWebDoc, lang: string | null | undefined): string {
  return ownWebPageUrl(`${localePrefix(lang)}/app/${doc}`);
}

/** "Tarayıcıda aç": aynı belgenin normal web sayfası (`/<doc>` ya da `/en/<doc>`). */
export function legalBrowserUrl(doc: LegalWebDoc, lang: string | null | undefined): string {
  return ownWebPageUrl(`${localePrefix(lang)}/${doc}`);
}

/**
 * Yol (sorgu/hash olabilir) uygulama modu sayfası mı: `/app/*` ya da locale
 * önekli `/en/app/*`. Yasal ekranların WebView'i yalnız bu yollarda kalır.
 */
export function isAppEmbedPath(pathWithQuery: string): boolean {
  const raw = pathWithQuery.split(/[?#]/)[0]!.replace(/\/{2,}/g, '/');
  return stripLocalePrefix(raw).startsWith('/app/');
}
