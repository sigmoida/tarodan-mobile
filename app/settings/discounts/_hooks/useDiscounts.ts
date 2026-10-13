import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { discountsApi, productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { initialForm, type Discount, type MyProduct } from '../_lib/types';
import { buildDiscountPayload, discountFormError, isRangeError } from '../_lib/form';

/**
 * Seller discount/coupon management controller — owns the discounts + products
 * queries, filter state, the form/product-picker modal state, and the save/
 * delete/toggle mutations. Lifted verbatim from the monolithic DiscountsScreen.
 */
export function useDiscounts() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'' | 'active' | 'inactive' | 'expired'>('');
  const [formOpen, setFormOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [form, setForm] = useState(initialForm());
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>(
    { visible: false, message: '' },
  );

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

  const productsQuery = useQuery({
    queryKey: qk.membership.discountProducts,
    queryFn: async () => {
      try {
        const response = await productsApi.getMyListings({ limit: 100, status: 'active' });
        const data: any = response.data;
        const items: MyProduct[] = data?.data ?? data?.items ?? data ?? [];
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const { refreshing, onRefresh } = useRefresh(discountsQuery.refetch, productsQuery.refetch);

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

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (form.id) {
        return discountsApi.update(form.id, payload);
      }
      return discountsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
      setFormOpen(false);
      setForm(initialForm());
      setSnackbar({ visible: true, message: form.id ? t('discount.updated') : t('discount.created') });
    },
    onError: (e: any) => {
      appAlert(t('common.error'), e?.response?.data?.message || t('discount.saveFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.membership.discounts });
      setSnackbar({ visible: true, message: t('discount.deleted') });
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
    setForm(initialForm());
    setFormOpen(true);
  };

  const openEdit = (d: Discount) => {
    setForm({
      id: d.id,
      code: d.code ?? '',
      name: d.name,
      description: d.description ?? '',
      type: d.type,
      value: String(d.value),
      buyQuantity: d.buyQuantity?.toString() ?? '',
      getQuantity: d.getQuantity?.toString() ?? '',
      minQuantity: d.minQuantity?.toString() ?? '',
      scope: d.scope === 'product' ? 'product' : 'seller',
      targetProductIds: d.targetProductIds ?? [],
      minCartValue: d.minCartValue?.toString() ?? '',
      maxDiscountAmount: d.maxDiscountAmount?.toString() ?? '',
      usageLimitTotal: d.usageLimitTotal?.toString() ?? '',
      usageLimitPerUser: String(d.usageLimitPerUser ?? 1),
      isStackable: d.isStackable,
      isActive: d.isActive,
      startDate: d.startDate.split('T')[0],
      endDate: d.endDate.split('T')[0],
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const errorKey = discountFormError(form);
    if (errorKey) {
      appAlert(isRangeError(errorKey) ? t('common.error') : t('common.missing'), t(errorKey));
      return;
    }
    saveMutation.mutate(buildDiscountPayload(form, !!form.id));
  };

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

  const products = productsQuery.data ?? [];

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
    // form + modals
    form,
    setForm,
    formOpen,
    setFormOpen,
    productPickerOpen,
    setProductPickerOpen,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    // mutations
    saveMutation,
    toggleActiveMutation,
    // products (picker)
    products,
    productsQuery,
    // snackbar
    snackbar,
    setSnackbar,
  };
}

export type DiscountsController = ReturnType<typeof useDiscounts>;
