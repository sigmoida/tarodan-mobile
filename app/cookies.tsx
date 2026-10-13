import { useTranslation } from 'react-i18next';
import { LegalDocument, useLegalTranslate } from '@/components/legal/LegalDocument';
import { cookiesDescription, cookiesParts } from '@/lib/legal/cookies';

/**
 * Çerez Politikası — web'deki metnin native kopyası (aynı katalog anahtarları,
 * aynı sıra: `@/lib/legal/cookies`); çevrimdışı açılır, dil uygulama dilini
 * izler. Web sayfasını WebView'de açmak yanıltıcıydı: site menüsü/altbilgisi
 * ve uygulamayı etkilemeyen tarayıcı tercih paneli görünüyor, onay kapısı bu
 * yolda gizlendiği için üye oradan bütün siteyi gezebiliyordu. Rota `/cookies`
 * olarak kalır (menü, onay kapısı bağlantısı, `isLegalTextPath`).
 */
export default function CookiePolicyScreen() {
  const { t } = useTranslation();
  const lt = useLegalTranslate();
  return (
    <LegalDocument
      testID="legal-cookies"
      title={t('legal.cookiesTitle')}
      description={cookiesDescription(lt)}
      notice={t('legal.cookiesAppNote')}
      parts={cookiesParts(lt)}
    />
  );
}
