import { useTranslation } from 'react-i18next';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { useAuthStore } from '@/stores/authStore';
import { AddressForm } from './_components/AddressForm';

/** Yeni adres — düz stack ekranı (liste "Yeni Adres" ile iter). Form `AddressForm`'da. */
export default function NewAddressScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <AuthGatePage title={t('address.newAddress')} icon="map-pin" subtitle={t('address.authGateSubtitle')} />
    );
  }
  return <AddressForm address={null} />;
}
