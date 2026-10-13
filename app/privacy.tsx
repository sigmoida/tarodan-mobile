import { useTranslation } from 'react-i18next';
import { LegalDocument, useLegalTranslate } from '@/components/legal/LegalDocument';
import { privacyParts } from '@/lib/legal/privacy';

/**
 * KVKK Aydınlatma Metni / Gizlilik Politikası — web'deki yürürlükteki metnin BİREBİR aynısı (aynı katalog
 * anahtarları, aynı yapı: `@/lib/legal/privacy`). Yeniden-onay kapısı üyeden
 * web'deki sürümün onayını istediği için mobil kendi eski metnini göstermez.
 */
export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const lt = useLegalTranslate();
  return (
    <LegalDocument
      testID="legal-privacy"
      title={t('legal.privacyTitle')}
      description={t('legal.privacy.pageDescription')}
      parts={privacyParts(lt)}
      footer={t('legal.privacy.pageFooter')}
    />
  );
}
