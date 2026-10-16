import React from 'react';
import { useTranslation } from 'react-i18next';
import { OwnSiteWebView } from '@/components/web/OwnSiteWebView';
import { LEGAL_WEB_DOC_TITLE_KEYS, legalEmbedUrl, type LegalWebDoc } from '@/lib/legal/webDocs';

/**
 * Yasal belge ekranı — web'in uygulama modu sayfasını (`/app/<doc>`, İngilizce
 * `/en/app/<doc>`) WebView'de gösterir; dil uygulama dilini (i18next) izler.
 * `embed` kipi: yalnız `/app/*` içeride kalır, diğer linkler sistem
 * tarayıcısında açılır; yükleme hatasında "Tekrar dene" + "Tarayıcıda aç"
 * (AYNI uygulama modu adresi: mağaza ekleri yalnız orada). Rotalar
 * (`app/terms.tsx` …) yalnız bunu çizer.
 */
export function LegalWebPage({ doc }: { doc: LegalWebDoc }) {
  const { t, i18n } = useTranslation();
  const url = legalEmbedUrl(doc, i18n.resolvedLanguage ?? i18n.language);
  return (
    <OwnSiteWebView
      mode="embed"
      url={url}
      browserUrl={url}
      title={t(LEGAL_WEB_DOC_TITLE_KEYS[doc])}
      testID={`legal-${doc}`}
    />
  );
}
