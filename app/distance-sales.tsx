import { useTranslation } from 'react-i18next';
import { LegalDocument, useLegalTranslate } from '@/components/legal/LegalDocument';
import { distanceSalesParts } from '@/lib/legal/distanceSales';

/**
 * Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi — web'deki yürürlükteki metnin BİREBİR aynısı (aynı katalog
 * anahtarları, aynı yapı: `@/lib/legal/distanceSales`). Yeniden-onay kapısı üyeden
 * web'deki sürümün onayını istediği için mobil kendi eski metnini göstermez.
 */
export default function DistanceSalesScreen() {
  const { t } = useTranslation();
  const lt = useLegalTranslate();
  return (
    <LegalDocument
      testID="legal-distance-sales"
      title={t('legal.distanceSalesTitle')}
      description={t('legal.distanceSales.pageDescription')}
      parts={distanceSalesParts(lt)}
      footer={t('legal.distanceSales.pageFooter')}
    />
  );
}
