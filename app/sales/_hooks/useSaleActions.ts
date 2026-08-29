import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import i18n from '@/i18n/config';
import { ordersApi, shippingApi, type Shipment } from '@/lib/api';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import type { Sale } from '../_lib/types';

/**
 * Seller sale-status controller — owns the prepare/ship mutation and the ship
 * dialog state + the two action handlers. Owns appAlert + invalidateQueries
 * (§6). Lifted verbatim from the monolithic screen.
 */
export function useSaleActions() {
  const queryClient = useQueryClient();
  const [shipDialog, setShipDialog] = useState<{ visible: boolean; order: Sale | null }>({
    visible: false,
    order: null,
  });

  /**
   * Backend'de tek "status update" endpoint'i yok; iki ayrı akış:
   *   - "processing"  → POST /orders/:id/prepare (markAsPreparing)
   *   - "shipped"     → önce OKU, kayıt yoksa ONAR
   * Bu mutasyon hangi durumun istendiğine göre doğru endpoint'i çağırır.
   */
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      if (status === 'processing' || status === 'preparing') {
        return ordersApi.markAsPreparing(orderId);
      }
      if (status === 'shipped') {
        // ÖNCE OKU: ödeme sonrası backend kaydı zaten oluşturmuş olabilir.
        // Mevcut kayda POST atmak `400 "Sipariş hazırlanma durumunda değil"`
        // veriyor (2026-08-10 ölçümü) ve satıcı ham hatayı görüyor.
        let existing: Shipment | null = null;
        try {
          const res = await shippingApi.getOrderShipments(orderId);
          const body = unwrapEnvelope<Partial<Shipment>>(res);
          // `unwrapEnvelope` veri yoksa `{}` döner (bkz. apiEnvelope.ts), `null`
          // değil — boş gövdeyi kayıt sanmamak için `id` yokluğuna bakıyoruz,
          // yoksa onarım yolu sessizce kapanır (kalıp: useOrderShipment).
          existing = body?.id ? (body as Shipment) : null;
        } catch (error: any) {
          if (error?.response?.status !== 404) throw error;
        }
        if (existing) return { alreadyExisted: true };
        // ONARIM yolu: kayıt yok. Sunucu durum kapısını kendi uyguluyor.
        await shippingApi.createShipment({ orderId, provider: 'surat' });
        return { alreadyExisted: false };
      }
      throw new Error(`Desteklenmeyen sipariş durumu: ${status}`);
    },
    /**
     * İKİ DAL, İKİ MESAJ. Hiçbirinde sipariş durumu DEĞİŞMİYOR: backend
     * `createShipment` yalnız kaydı açar, sipariş `shipped`'e şube kabulüyle
     * geçer. "Sipariş durumu güncellendi" demek satıcıya olmayan bir ilerleme
     * bildiriyor ve aynı butona tekrar tekrar bastırıyordu.
     * `markAsPreparing` (result yok) eski mesajını korur — orada durum
     * gerçekten değişiyor.
     */
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
      setShipDialog({ visible: false, order: null });
      if (!result || !('alreadyExisted' in result)) {
        appAlert(i18n.t('common.success'), i18n.t('order.statusUpdated'));
        return;
      }
      appAlert(
        i18n.t(result.alreadyExisted ? 'order.shipmentRecordExistsTitle' : 'order.shipmentRecordCreatedTitle'),
        i18n.t(result.alreadyExisted ? 'order.shipmentRecordExists' : 'order.shipmentRecordCreated'),
      );
    },
    onError: (e: any) => {
      appAlert(i18n.t('common.error'), e?.response?.data?.message || e?.message || i18n.t('order.statusUpdateFailed'));
    },
  });

  const handleMarkAsProcessing = (order: Sale) => {
    appAlert(
      i18n.t('sale.markPreparingConfirmTitle'),
      i18n.t('sale.markPreparingConfirmBody'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.confirm'),
          onPress: () => updateStatusMutation.mutate({ orderId: order.id, status: 'processing' }),
        },
      ],
    );
  };

  const handleShip = () => {
    if (!shipDialog.order) return;
    updateStatusMutation.mutate({ orderId: shipDialog.order.id, status: 'shipped' });
  };

  return {
    updateStatusMutation,
    shipDialog,
    setShipDialog,
    handleMarkAsProcessing,
    handleShip,
  };
}

export type SaleActionsController = ReturnType<typeof useSaleActions>;
