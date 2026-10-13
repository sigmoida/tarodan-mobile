import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, SectionCard } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { styles } from './_lib/styles';
import { useAddresses } from './_hooks/useAddresses';
import { useAddressActions } from './_hooks/useAddressActions';
import { AddressCard } from './_components/AddressCard';

/**
 * Kayıtlı adresler — D1b REFERANS EKRANI (liste): PageShell (beyaz üst bar, Skeleton,
 * çekip yenileme) + web profilindeki gibi tek SectionCard (adet rozeti + "Yeni Adres"
 * aksiyonu) içinde satırlar; boşken kart içi EmptyState. Ekle/düzenle ayrı EKRANLAR
 * (`new`, `[id]/edit`); `useAddresses` sorgu, `useAddressActions` yönlendirme + mutasyonlar.
 */
export default function AddressesScreen() {
  const { t } = useTranslation();
  const f = useAddresses();
  const a = useAddressActions(f.addresses, f.maxAddresses);
  const title = t('mobile.settingsAddresses');
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        onBack={onBack}
        empty
        emptyState={{
          icon: 'map-pin',
          title,
          subtitle: t('address.authGateSubtitle'),
          actionLabel: t('common.login'),
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
            <Button size="sm" icon="plus" title={t('address.newAddress')} onPress={a.openAdd} />
          ) : undefined
        }
        bodyStyle={styles.list}
      >
        {f.addresses.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title={t('mobile.noSavedAddress')}
            subtitle={t('address.emptySubtitle')}
            actionLabel={t('address.addNewAddress')}
            onAction={a.openAdd}
          />
        ) : (
          f.addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => a.openEdit(address)}
              onDelete={() => a.handleDelete(address)}
              onSetDefault={() => a.setDefaultMutation.mutate(address.id)}
              setDefaultPending={
                a.setDefaultMutation.isPending && a.setDefaultMutation.variables === address.id
              }
            />
          ))
        )}
      </SectionCard>
    </PageShell>
  );
}
