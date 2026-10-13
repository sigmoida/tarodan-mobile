import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { useAuthStore } from '@/stores/authStore';
import { AddressForm } from '../_components/AddressForm';
import { useAddress } from '../_hooks/useAddresses';

/**
 * Adresi düzenle — düz stack ekranı. Adres liste önbelleğinden gelir (derin
 * bağlantıda çekilir); form yalnız adres hazırken bağlanır, böylece varsayılan
 * değerler bir kez kurulur ve arka plan yenilemesi taslağı ezmez.
 */
export default function EditAddressScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { address, isLoading, isError, refetch } = useAddress(id);
  const title = t('address.editAddress');

  if (!isAuthenticated) {
    return <AuthGatePage title={title} icon="map-pin" subtitle={t('address.authGateSubtitle')} />;
  }
  if (!address) {
    return (
      <PageShell
        title={title}
        loading={isLoading}
        error={isError || undefined}
        onRetry={refetch}
        empty
        emptyState={{
          icon: 'map-pin',
          title: t('error.pageNotFound'),
          subtitle: t('emptyState.notFoundHint'),
        }}
      />
    );
  }
  return <AddressForm key={address.id} address={address} />;
}
