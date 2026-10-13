import { router } from 'expo-router';
import { Badge, Button, EmptyState, SectionCard } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { styles } from './_lib/styles';
import { useAddresses } from './_hooks/useAddresses';
import { AddressCard } from './_components/AddressCard';
import { AddressFormModal } from './_components/AddressFormModal';

/**
 * Kayıtlı adresler — D1b REFERANS EKRANI (liste): PageShell (beyaz üst bar, Skeleton,
 * çekip yenileme) + web profilindeki gibi tek SectionCard (adet rozeti + "Yeni Adres"
 * aksiyonu) içinde satırlar; boşken kart içi EmptyState. `useAddresses` sorgu, mutasyon ve
 * form durumunun sahibi; ekran yalnız kompozisyon.
 */
export default function AddressesScreen() {
  const f = useAddresses();
  const title = f.t('mobile.settingsAddresses');
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        onBack={onBack}
        empty
        emptyState={{
          icon: 'location-outline',
          title,
          subtitle: f.t('address.authGateSubtitle'),
          actionLabel: f.t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  const canAdd = f.addresses.length < f.maxAddresses;

  return (
    <PageShell
      title={title}
      onBack={onBack}
      loading={f.isLoading}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <SectionCard
        badge={
          <Badge variant="outline" size="sm">
            {f.addresses.length}/{f.maxAddresses}
          </Badge>
        }
        action={
          canAdd && f.addresses.length > 0 ? (
            <Button size="sm" icon="add" title={f.t('address.newAddress')} onPress={f.openAddDialog} />
          ) : undefined
        }
        bodyStyle={styles.list}
      >
        {f.addresses.length === 0 ? (
          <EmptyState
            size="compact"
            icon="location-outline"
            title={f.t('mobile.noSavedAddress')}
            subtitle={f.t('address.emptySubtitle')}
            actionLabel={f.t('address.addNewAddress')}
            onAction={f.openAddDialog}
          />
        ) : (
          f.addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => f.openEditDialog(address)}
              onDelete={() => f.handleDelete(address)}
              onSetDefault={() => f.setDefaultMutation.mutate(address.id)}
              setDefaultPending={
                f.setDefaultMutation.isPending && f.setDefaultMutation.variables === address.id
              }
            />
          ))
        )}
      </SectionCard>

      <AddressFormModal f={f} />
    </PageShell>
  );
}
