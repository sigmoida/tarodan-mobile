import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { captureException } from '@/services/sentry';
import type { OrderCancellationReason } from '@/lib/shared/orderCancellation';
import { apiStatusToUi } from '@/utils/orderStatus';
import type { GroupDetail, GroupOrder, GroupPackage } from '../_lib/types';

/**
 * Order-group controller — owns the group query (with the raw→UI status mapping)
 * and pull-to-refresh. Lifted verbatim from the monolithic screen (§12).
 */
export function useOrderGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    variant: 'success' | 'danger';
  }>({ visible: false, message: '', variant: 'success' });

  const { data: group, isLoading, refetch, error } = useQuery({
    queryKey: ['order-group', id],
    queryFn: async (): Promise<GroupDetail> => {
      const response = await ordersApi.getGroup(id!);
      const raw: any = response.data?.data ?? response.data;
      return {
        id: raw.id,
        groupNumber: raw.groupNumber,
        totalAmount: Number(raw.totalAmount ?? 0),
        status: raw.status === 'mixed' ? 'mixed' : apiStatusToUi(raw.status),
        createdAt: raw.createdAt,
        payment: raw.payment ?? null,
        orders: (raw.orders || []).map((o: any): GroupOrder => ({
          ...o,
          status: apiStatusToUi(o.status),
          totalAmount: Number(o.totalAmount ?? o.amount ?? 0),
          product: {
            ...(o.product || {}),
            id: o.product?.id ?? '',
            title: o.product?.title ?? '',
          },
        })),
        // Satıcı-bazlı kargo kırılımı (B10). Para HESAPLANMAZ — `shippingCost`
        // sunucunun gönderdiği gibi basılır. Takip linki `deriveShipmentView`
        // üzerinden kurulur; sunucunun `cargo.trackingUrl`'ı hiç okunmaz (o,
        // Sürat'ın tanımadığı iç referanstan kurulu bozuk bir link).
        packages: (raw.packages || []).map((p: any): GroupPackage => ({
          id: p.id,
          packageNumber: p.packageNumber ?? null,
          sellerId: p.sellerId ?? null,
          seller: p.seller
            ? {
                id: p.seller.id,
                publicName: p.seller.publicName,
                displayName: p.seller.displayName ?? p.seller.publicName ?? '',
              }
            : null,
          shippingCost: Number(p.shippingCost ?? 0),
          cargo: p.cargo
            ? {
                trackingNumber: p.cargo.trackingNumber ?? null,
                cargoCode: p.cargo.cargoCode ?? null,
                provider: p.cargo.provider ?? null,
                status: p.cargo.status ?? null,
                shippedAt: p.cargo.shippedAt ?? null,
                deliveredAt: p.cargo.deliveredAt ?? null,
              }
            : null,
        })),
      };
    },
    enabled: !!id,
  });

  /**
   * SEPETİN TAMAMINI iptal et. Web'de 2026-08-12'den beri var; burada grup
   * ekranı salt okunurdu, yani çok satıcılı bir siparişi iptal etmenin tek yolu
   * kalemleri tek tek gezmekti.
   */
  const cancelGroupMutation = useMutation({
    mutationFn: (input: { reasonCode: OrderCancellationReason; reason?: string }) =>
      ordersApi.cancelGroup(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-group', id] });
      queryClient.invalidateQueries({ queryKey: qk.orders.all });
      setSnackbar({ visible: true, message: t('order.orderCancelled'), variant: 'success' });
    },
    onError: (err: any) => {
      captureException(err, {
        level: 'error',
        tags: { flow: 'order.cancelGroup' },
        extra: { status: err?.response?.status },
      });
      const raw = err?.response?.data?.message;
      setSnackbar({
        visible: true,
        message: typeof raw === 'string' ? raw : t('order.orderCancelFailed'),
        variant: 'danger',
      });
    },
  });

  /**
   * Grup iptal edilebilir mi? Tek bir kalem bile kargoya verilmişse sunucu
   * reddeder — butonu göstermek kullanıcıyı doğrudan o hataya yürütür.
   */
  // `status` burada UI durumu (`apiStatusToUi`): sunucunun `paid`/`preparing`
  // ikilisi tek bir `processing`e iniyor. Kargoya devirden önceki durumlar
  // yalnız `pending` (ödeme bekliyor) ve `processing`.
  const CANCELLABLE_UI_STATUSES: Array<GroupOrder['status']> = ['pending', 'processing'];
  const cancellable =
    !!group &&
    group.orders.length > 0 &&
    group.orders.every(
      (o) => o.cancellationType !== 'iptal' && CANCELLABLE_UI_STATUSES.includes(o.status),
    );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return {
    group,
    isLoading,
    error,
    refetch,
    refreshing,
    onRefresh,
    snackbar,
    dismissSnackbar: () => setSnackbar((s) => ({ ...s, visible: false })),
    cancel: {
      available: cancellable,
      visible: cancelModalVisible,
      open: () => setCancelModalVisible(true),
      close: () => setCancelModalVisible(false),
      /** `pending` dışında ödeme alınmıştır → iade uyarısı gösterilir. */
      willRefund: !!group && group.orders.some((o) => o.status !== 'pending'),
      confirm: cancelGroupMutation.mutate,
      isPending: cancelGroupMutation.isPending,
    },
  };
}

export type OrderGroupController = ReturnType<typeof useOrderGroup>;
