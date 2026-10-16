import { useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { discountsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { discountRoutes, type Discount } from '../_lib/types';
import { useDiscountsQuery } from './useDiscountsQuery';

/**
 * İndirim LİSTESİ denetleyicisi — sorgu + filtre, yeni/düzenle ekranına
 * yönlendirme, silme onayı ve sil/aktiflik mutasyonları (`useAppMutation`:
 * geçersiz kılma + toast tek yerden). Form ayrı ekranlarda (`new`, `[id]/edit`).
 */
export function useDiscounts() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<'' | 'active' | 'inactive' | 'expired'>('');

  const discountsQuery = useDiscountsQuery();
  const { refreshing, onRefresh } = useRefresh(discountsQuery.refetch);

  const filteredDiscounts = useMemo(() => {
    const list = discountsQuery.data ?? [];
    const now = new Date();
    if (filter === 'active') {
      return list.filter((d) => d.isActive && d.isCurrentlyValid !== false);
    }
    if (filter === 'inactive') {
      return list.filter((d) => !d.isActive);
    }
    if (filter === 'expired') {
      return list.filter((d) => new Date(d.endDate) < now);
    }
    return list;
  }, [discountsQuery.data, filter]);

  const deleteMutation = useAppMutation((id: string) => discountsApi.delete(id), {
    invalidates: [qk.membership.discounts],
    success: t('discount.deleted'),
    error: t('discount.deleteFailed'),
  });

  const toggleActiveMutation = useAppMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => discountsApi.update(id, { isActive }),
    {
      invalidates: [qk.membership.discounts],
      error: t('discount.saveFailed'),
    },
  );

  // Kararlı referanslar: memo'lu DiscountCard satırları her render'da yeniden çizilmesin.
  const { mutate: deleteDiscount } = deleteMutation;
  const { mutate: toggleDiscount } = toggleActiveMutation;
  const openCreate = useCallback(() => router.push(discountRoutes.new as never), []);
  const openEdit = useCallback((d: Discount) => router.push(discountRoutes.edit(d.id) as never), []);
  const toggleActive = useCallback(
    (d: Discount, isActive: boolean) => toggleDiscount({ id: d.id, isActive }),
    [toggleDiscount],
  );

  const handleDelete = useCallback(
    (d: Discount) => {
      appAlert(
        t('discount.deleteTitle'),
        t('discount.deleteConfirmNamed', { name: d.name }),
        [
          { text: t('discount.discard'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => deleteDiscount(d.id) },
        ],
      );
    },
    [t, deleteDiscount],
  );

  return {
    // gates
    isAuthenticated,
    user,
    // list + filter
    filter,
    setFilter,
    discountsQuery,
    filteredDiscounts,
    refreshing,
    onRefresh,
    // navigation + actions
    openCreate,
    openEdit,
    handleDelete,
    toggleActive,
    toggleActiveMutation,
  };
}

export type DiscountsController = ReturnType<typeof useDiscounts>;
