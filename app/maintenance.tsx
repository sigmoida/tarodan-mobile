import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { GateScreen } from '@/components/common/GateScreen';

const retry = () => router.replace('/(tabs)');

/**
 * Bakım ekranı — kapı değil, bilgi ekranı: kullanıcı burada kilitli kalmaz. "Tekrar dene" ve Android geri
 * tuşu ana sayfaya döner (bakım sürüyorsa istekler yine buraya yönlendirir); yığında geri gidilmez.
 */
export default function MaintenanceScreen() {
  const { t } = useTranslation();
  return (
    <GateScreen
      icon="wrench-screwdriver"
      title={t('mobile.maintenanceTitle')}
      description={t('mobile.maintenanceDescription')}
      onHardwareBack={retry}
      actions={<Button variant="primary" fullWidth title={t('common.tryAgain')} onPress={retry} />}
    />
  );
}
