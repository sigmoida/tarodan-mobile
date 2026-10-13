import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert, toast } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { discountsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import type { Discount } from '../_lib/types';

/**
 * Seller discount/coupon management controller — owns the discounts query,
 * filter state, the open/close state of the form modal, and the delete/toggle
 * mutations. The form modal owns its own `useZodForm` + save mutation.
 */
export function useDiscounts() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'' | 'active' | 'inactive' | 'expired'>('');
  const [formOpen, setFormOpen] = useState(false);
  // Düzenlenen indirim (null = yeni). Kapanış animasyonu boyunca korunur.
  const [editing, setEditing] = useState<Discount | null>(null);

  const discountsQuery = useQuery({
    queryKey: qk.membership.discounts,
    queryFn: async () => {
      const response = await discountsApi.getAll({ limit: 100 });
      const data: any = response.data;
      const items: Discount[] = data?.items ?? data?.data ?? data ?? [];
      return Array.isArray(items) ? items : [];
    },
    enabled: isAuthenticated,
  });

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
      toast.success(t('discount.deleted'));
    },
    onError: (e: any) => {
      appAlert(t('common.error'), e?.response?.data?.message || t('discount.deleteFailed'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      discountsApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const showSaved = (message: string) => toast.success(message);

  const handleDelete = (d: Discount) => {
    appAlert(
      t('discount.deleteTitle'),
      t('discount.deleteConfirmNamed', { name: d.name }),
      [
        { text: t('discount.discard'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(d.id) },
      ],
    );
  };

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
    // form modal (kendi form + mutasyonunu taşır)
    formOpen,
    editing,
    openCreate,
    openEdit,
    closeForm,
    showSaved,
    handleDelete,
    // mutations
    toggleActiveMutation,
  };
}

export type DiscountsController = ReturnType<typeof useDiscounts>;
