/**
 * Çerez Politikası — web `apps/web/src/app/[locale]/(main)/(legal)/cookies/
 * _components/CookiesClient.tsx` metninin native kopyası. Metin burada
 * YAZILMAZ: aynı katalog anahtarları (`legal.cookies.*`), aynı sıra. Web
 * değişince bu dosyayı ve anahtarları yeniden kopyala.
 *
 * Web'den farklar (bilerek):
 * - 2. bölümdeki tarayıcı çerez TERCİH PANELİ (anahtarlar + kaydet) çizilmez:
 *   uygulamanın kendi ekranları çerez kullanmaz, panel uygulamada hiçbir şeyi
 *   değiştirmezdi. Kategoriler yalnız ad + açıklama olarak listelenir.
 * - Tablolar başlıklı gruplara, bağlantılar düz metne dönüşür (native, çevrimdışı).
 * - İletişim: web'deki "0850 XXX XX XX" yer tutucu telefon yerine künyedeki
 *   (`LEGAL_ENTITY`) gerçek telefon ve e-posta.
 * - Dil: bağlayıcı gövde (paragraflar, tablo içerikleri) iki dilde Türkçe (web
 *   gibi); başlıklar, notlar, sütun/iletişim etiketleri ve tarih EN'de
 *   İngilizce (web EN kataloğunda bunlar da Türkçe — mobil sapma, bkz.
 *   `catalog-integrity` muafiyeti).
 */
import { LEGAL_ENTITY } from '@/constants/legalFacts';
import type { LegalBlock, LegalPart, Translate } from './types';

/** Katalogdaki `<b>…</b>` vurgusu (web `t.rich`) native düz metinde düşer. */
const plain = (text: string) => text.replace(/<\/?b>/g, '');

/** Web etiketleri "E-posta:" gibi iki noktalı; `LegalDocument` iki noktayı kendisi ekler. */
const label = (text: string) => text.replace(/:\s*$/, '');

/** Sağlayıcı ADLARI markadır ve çevrilmez (web ile aynı). */
const THIRD_PARTIES = [
  { name: 'Google (Analytics, Tag Manager, Ads, YouTube)', purpose: 'legal.cookies.page.thirdPartyGooglePurpose', href: 'https://policies.google.com/privacy' },
  { name: 'Yandex (Metrica, Direct)', purpose: 'legal.cookies.page.thirdPartyYandexPurpose', href: 'https://yandex.com/legal/confidential/' },
  { name: 'Meta (Facebook / Instagram)', purpose: 'legal.cookies.page.thirdPartyMetaPurpose', href: 'https://www.facebook.com/privacy/policy' },
  { name: 'TikTok', purpose: 'legal.cookies.page.thirdPartyTiktokPurpose', href: 'https://www.tiktok.com/legal/privacy-policy' },
  { name: 'PayTR', purpose: 'legal.cookies.page.thirdPartyPaytrPurpose', href: 'https://www.paytr.com/kvkk' },
] as const;

/** Tarayıcı adları markadır (web ile aynı bağlantılar). */
const BROWSER_GUIDES = [
  { name: 'Google Chrome', href: 'https://support.google.com/chrome/answer/95647' },
  { name: 'Mozilla Firefox', href: 'https://support.mozilla.org/tr/kb/cerezleri-etkinlestirme-ve-devre-disi-birakma' },
  { name: 'Apple Safari', href: 'https://support.apple.com/tr-tr/guide/safari/sfri11471/mac' },
  { name: 'Microsoft Edge', href: 'https://support.microsoft.com/tr-tr/microsoft-edge' },
] as const;

const SCOPE_ROWS = ['Kvkk', 'Consent', 'Etk', 'Contract'] as const;
const RETENTION_ROWS = ['Traffic', 'Finance', 'Etk', 'Membership', 'Consent'] as const;

/** Başlık satırı: web'deki "Son güncelleme: 2 Ağustos 2026". */
export const cookiesDescription = (t: Translate): string =>
  `${t('legal.lastUpdated')}: ${t('legal.cookies.page.lastUpdatedValue')}`;

export const cookiesParts = (t: Translate): LegalPart[] => {
  const part = (title: string, blocks: LegalBlock[]): LegalPart => ({ title, blocks, sections: [] });
  return [
    part(t('legal.cookies.page.s1Title'), [
      { type: 'p', text: t('legal.cookies.page.s1p1') },
      { type: 'p', text: plain(t('legal.cookies.page.s1p2')) },
      { type: 'p', text: t('legal.cookies.page.s1p3') },
    ]),
    part(t('legal.cookies.page.s2Title'), [
      {
        type: 'list',
        items: [
          { label: t('legal.necessaryCookies'), text: t('legal.cookies.necessaryDesc') },
          { label: t('legal.functionalCookies'), text: t('legal.cookies.functionalDesc') },
          { label: t('legal.analyticsCookies'), text: t('legal.cookies.analyticsDesc') },
          { label: t('legal.marketingCookies'), text: t('legal.cookies.marketingDesc') },
        ],
      },
    ]),
    part(t('legal.cookies.page.s3Title'), [
      { type: 'p', text: t('legal.cookies.page.s3Intro') },
      {
        type: 'list',
        items: THIRD_PARTIES.map((p) => ({ label: p.name, text: `${t(p.purpose)} (${p.href})` })),
      },
    ]),
    part(t('legal.cookies.page.s4Title'), [
      { type: 'p', text: t('legal.cookies.page.s4Intro') },
      {
        type: 'groups',
        groups: SCOPE_ROWS.map((row) => ({
          title: t(`legal.cookies.page.scope${row}Criterion`),
          items: [
            `${t('legal.cookies.page.colIndividual')}: ${t(`legal.cookies.page.scope${row}Individual`)}`,
            `${t('legal.cookies.page.colCorporate')}: ${t(`legal.cookies.page.scope${row}Corporate`)}`,
          ],
        })),
      },
    ]),
    part(t('legal.cookies.page.s5Title'), [
      { type: 'p', text: t('legal.cookies.page.s5Intro') },
      {
        type: 'groups',
        groups: RETENTION_ROWS.map((row) => ({
          title: t(`legal.cookies.page.retention${row}Type`),
          items: [
            `${t('legal.cookies.page.colStoredData')}: ${t(`legal.cookies.page.retention${row}Data`)}`,
            `${t('legal.cookies.page.colLegalBasis')}: ${t(`legal.cookies.page.retention${row}Basis`)}`,
            `${t('legal.cookies.page.colRetention')}: ${t(`legal.cookies.page.retention${row}Period`)}`,
          ],
        })),
      },
      { type: 'note', text: t('legal.cookies.page.s5Note') },
    ]),
    part(t('legal.cookies.page.s6Title'), [
      { type: 'p', text: t('legal.cookies.page.s6p1') },
      { type: 'list', items: BROWSER_GUIDES.map((g) => ({ label: g.name, text: g.href })) },
      { type: 'note', text: plain(t('legal.cookies.page.s6Warning')) },
    ]),
    part(t('legal.cookies.page.s7Title'), [
      { type: 'p', text: t('legal.cookies.page.s7p1') },
      {
        type: 'list',
        items: [
          { label: label(t('legal.cookies.page.contactEmailLabel')), text: LEGAL_ENTITY.email },
          { label: label(t('legal.cookies.page.contactPhoneLabel')), text: LEGAL_ENTITY.phone },
        ],
      },
    ]),
  ];
};
