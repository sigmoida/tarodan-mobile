import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, Text, TopBarAction } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { styles } from './_lib/styles';
import { useAddresses } from './_hooks/useAddresses';
import { useAddressActions } from './_hooks/useAddressActions';
import { AddressCard } from './_components/AddressCard';
import { AddressesSkeleton } from './_components/AddressesSkeleton';

/**
 * Kayıtlı adresler — D1b REFERANS EKRANI (liste): PageShell (beyaz üst bar, Skeleton,
 * çekip yenileme) + üst barın sağında "+" (yeni adres; limit dolunca / liste boşken gizli) +
 * kartın üstünde soluk "1/3 adres kayıtlı" satırı (limit bilinmiyorsa yok) + tek SectionCard içinde satırlar; boşken kart
 * içi EmptyState (kendi "Yeni Adres Ekle" eylemiyle). Ekle/düzenle ayrı EKRANLAR (`new`,
 * `[id]/edit`); `useAddresses` sorgu, `useAddressActions` yönlendirme + mutasyonlar.
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
      loadingFallback={<AddressesSkeleton />}
      error={f.loadFailed || undefined}
      onRetry={f.retry}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      right={
        // Önceki kuralla aynı: limit dolunca ve liste boşken (EmptyState'in kendi eylemi var) yok.
        canAdd && f.addresses.length > 0 ? (
          <TopBarAction
            icon="plus"
            accessibilityLabel={t('address.newAddress')}
            onPress={a.openAdd}
            testID="address-add-button"
          />
        ) : undefined
      }
    >
      {Number.isFinite(f.maxAddresses) ? (
        <Text variant="bodySm" tone="muted" testID="address-limit-usage">
          {t('address.limitUsage', { count: f.addresses.length, max: f.maxAddresses })}
        </Text>
      ) : null}
      <SectionCard bodyStyle={styles.list}>
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
