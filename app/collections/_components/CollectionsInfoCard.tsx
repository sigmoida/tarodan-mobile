import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@/ui';
import UpgradeCta from '@/components/UpgradeCta';

/**
 * Digital Garage upsell bilgi kartı — premium olmayan üyeye gösterilir.
 *
 * Kart bütünüyle satışa yönelik: açıklama metni "Premium üyeler kendi
 * garajlarını oluşturabilir" diyor ve düğme Premium'a çağırıyor. Bu yüzden
 * iOS'ta yalnız düğme değil, kartın tamamı kapanır (Guideline 3.1.1/3.1.3).
 */
export function CollectionsInfoCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();
  return (
    <UpgradeCta>
      <Alert variant="info" title={t('collection.digitalGarageWhatTitle')}>
        {t('collection.digitalGarageInfoDesc')}
      </Alert>
      <Button
        variant="outline"
        title={t('collection.becomePremiumCta')}
        onPress={() => router.push(isAuthenticated ? '/upgrade' : '/(auth)/login')}
        fullWidth
      />
    </UpgradeCta>
  );
}
