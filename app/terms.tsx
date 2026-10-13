import { useTranslation } from 'react-i18next';
import { LegalDocument, useLegalTranslate } from '@/components/legal/LegalDocument';
import { termsParts } from '@/lib/legal/terms';
import { termsAppStoreAddendum } from '@/lib/legal/appStoreAddenda';

/**
 * Platform Kullanım Koşulları — web'deki yürürlükteki metnin BİREBİR aynısı (aynı katalog
 * anahtarları, aynı yapı: `@/lib/legal/terms`). Yeniden-onay kapısı üyeden
 * web'deki sürümün onayını istediği için mobil kendi eski metnini göstermez.
 * Sonuna yalnız mağaza kuralının (Apple 1.2) istediği içerik bölümü eklenir
 * (`termsAppStoreAddendum`).
 */
export default function TermsScreen() {
  const { t } = useTranslation();
  const lt = useLegalTranslate();
  return (
    <LegalDocument
      testID="legal-terms"
      title={t('legal.termsTitle')}
      description={t('legal.terms.pageDescription')}
      parts={[...termsParts(lt), termsAppStoreAddendum(lt)]}
      footer={t('legal.terms.pageFooter')}
    />
  );
}
