import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/ui';
import { ordersApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import { captureException } from '@/services/sentry';
import type { OrderCancellationReason } from '@/lib/shared/orderCancellation';
import { apiStatusToUi } from '@/utils/orderStatus';
import { noteOrderKindFallback } from '@/lib/shared/orderKindFallback';
import { isDigitalOrder } from '@/types';
import { isGroupCancellable } from '../_lib/status';
import type { GroupDetail, GroupOrder, GroupPackage } from '../_lib/types';

/**
 * Order-group controller — owns the group query (with the raw→UI status mapping)
 * and pull-to-refresh. Lifted verbatim from the monolithic screen (app/CLAUDE.md › Worked examples).
 */
export function useOrderGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const { data: group, isLoading, refetch, error } = useQuery({
    queryKey: qk.orders.group(String(id ?? '')),
    queryFn: async (): Promise<GroupDetail> => {
      const response = await ordersApi.getGroup(id!);
      const raw: any = response.data?.data ?? response.data;
      noteOrderKindFallback({ groupId: String(raw.id ?? id) }, raw.orders ?? []);
      return {
        id: raw.id,
        viewerRole: raw.viewerRole === 'buyer' || raw.viewerRole === 'seller' ? raw.viewerRole : null,
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
          isDigital: Array.isArray(p.orders) && p.orders.length > 0 && p.orders.every(isDigitalOrder),
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
      queryClient.invalidateQueries({ queryKey: qk.orders.group(String(id ?? '')) });
      queryClient.invalidateQueries({ queryKey: qk.orders.all });
      toast.success(t('order.orderCancelled'));
    },
    onError: (err: any) => {
      captureException(err, {
        level: 'error',
        tags: { flow: 'order.cancelGroup' },
        extra: { status: err?.response?.status },
      });
      toast.error(apiErrorMessage(err, t('order.orderCancelFailed')));
    },
  });

  const cancellable = !!group && isGroupCancellable(group);

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
