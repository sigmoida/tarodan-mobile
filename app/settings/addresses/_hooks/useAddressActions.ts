import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { CAN_BUY_DIGITAL, limitAlert } from '@/lib/purchases';
import { api, addressesApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { addressRoutes, type Address } from '../_lib/types';

/**
 * Liste ekranının eylemleri: yeni/düzenle ekranına yönlendirme (limit kapısı
 * dahil), silme onayı + mutasyonu, varsayılan yapma mutasyonu. Mutasyonlar
 * `useAppMutation`: geçersiz kılma + toast tek yerden (hata `toast.error`).
 */
export function useAddressActions(addresses: Address[], maxAddresses: number) {
  const { t } = useTranslation();

  const deleteMutation = useAppMutation(
    (addressId: string) => api.delete(`/users/me/addresses/${addressId}`),
    {
      invalidates: [qk.user.addresses],
      success: t('address.deleted'),
      error: t('address.deleteFailed'),
    },
  );

  // API'de `PATCH /users/me/addresses/:id/default` YOK. Doğrusu web ile aynı:
  // `PATCH /users/me/addresses/:id` gövdesi `{ isDefault: true }` (sunucu
  // diğerlerinin bayrağını kendisi düşürür).
  const setDefaultMutation = useAppMutation(
    (addressId: string) => addressesApi.setDefault(addressId),
    {
      invalidates: [qk.user.addresses],
      error: t('address.defaultFailed'),
    },
  );

  const openAdd = () => {
    if (addresses.length >= maxAddresses) {
      limitAlert({
        title: t('address.limitTitle'),
        message: CAN_BUY_DIGITAL
          ? t('address.limitBody', { max: maxAddresses })
          : t('address.limitReachedInfo', { max: maxAddresses }),
        cancelLabel: t('common.cancel'),
        upgradeLabel: t('address.goPremium'),
        onUpgrade: () => router.push('/upgrade'),
      });
      return;
    }
    router.push(addressRoutes.new as never);
  };

  const openEdit = (address: Address) => router.push(addressRoutes.edit(address.id) as never);

  const handleDelete = (address: Address) => {
    appAlert(
      t('address.deleteAddress'),
      t('address.deleteConfirmNamed', { title: address.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(address.id),
        },
      ],
    );
  };

  return { openAdd, openEdit, handleDelete, setDefaultMutation };
}
