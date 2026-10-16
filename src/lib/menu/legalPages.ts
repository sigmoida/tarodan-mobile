import type { TFunction } from 'i18next';
import { LEGAL_WEB_DOCS, LEGAL_WEB_DOC_TITLE_KEYS, type LegalWebDoc } from '@/lib/legal/webDocs';

/**
 * Yan menünün "Bilgi & Yasal" grubu — uygulamada kalan yasal belgeler, TEK
 * listeden (`LEGAL_WEB_DOCS`) türer; etiket ekran başlığıyla aynı anahtar.
 * Her satır aynı adlı native rotayı açar (`/terms` …); ekran web'in uygulama
 * modu sayfasını WebView'de gösterir (`LegalWebPage`). testID
 * `profile-legal-<doc>-link`. Yardım (native SSS) "İletişim" grubunda.
 *
 * Etiketler çeviriden geldiği için liste bir FABRİKA (modül seviyesinde
 * kurulsaydı ilk dilde donardı).
 */
export const buildLegalPages = (
  t: TFunction,
): ReadonlyArray<{ doc: LegalWebDoc; route: `/${LegalWebDoc}`; label: string }> =>
  LEGAL_WEB_DOCS.map((doc) => ({
    doc,
    route: `/${doc}` as const,
    label: t(LEGAL_WEB_DOC_TITLE_KEYS[doc]),
  }));
