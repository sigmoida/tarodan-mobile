import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GateScreen } from '@/components/common/GateScreen';

/** Bakım ekranı — yalnız bilgi; kullanıcının yapacağı bir şey yok. */
export default function MaintenanceScreen() {
  const { t } = useTranslation();
  return (
    <GateScreen
      icon="wrench-screwdriver"
      title={t('mobile.maintenanceTitle')}
      description={t('mobile.maintenanceDescription')}
    >
      <Stack.Screen options={{ title: t('mobile.maintenanceHeaderTitle') }} />
    </GateScreen>
  );
}
