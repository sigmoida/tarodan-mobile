import { useState } from 'react';
import { appAlert, toast } from '@/ui';
import i18n from '@/i18n/config';
import { ordersApi, shippingApi, type Shipment } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import type { Sale } from '../_lib/types';

/**
 * Seller sale-status controller — owns the prepare/ship mutation and the ship
 * dialog state + the two action handlers. Owns the feedback + invalidation
 * (`useAppMutation`, §6). Ship dialog closes BEFORE the mutation fires (§12:
 * a result alert/toast must never compete with an open native Modal).
 */
export function useSaleActions() {
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
  const updateStatusMutation = useAppMutation(
    async ({ orderId, status }: { orderId: string; status: string }) => {
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
      throw new Error(i18n.t('order.unsupportedStatus'));
    },
    {
      invalidates: [qk.orders.all, qk.shipping.all],
      error: () => i18n.t('order.statusUpdateFailed'),
      /**
       * İKİ DAL, İKİ MESAJ. Hiçbirinde sipariş durumu DEĞİŞMİYOR: backend
       * `createShipment` yalnız kaydı açar, sipariş `shipped`'e şube kabulüyle
       * geçer. "Sipariş durumu güncellendi" demek satıcıya olmayan bir ilerleme
       * bildiriyor ve aynı butona tekrar tekrar bastırıyordu.
       * `markAsPreparing` (result yok) eski mesajını korur — orada durum
       * gerçekten değişiyor (kısa başarı → toast). Kargo kaydı mesajları satıcının
       * şubede yapacağı işi anlatır (çok cümleli yönerge) → başlıklı diyalog; modal
       * gönderimde zaten kapandığı için açık Modal ile yarışmaz.
       */
      onSuccess: (result) => {
        if (!result || !('alreadyExisted' in result)) {
          toast.success(i18n.t('order.statusUpdated'));
          return;
        }
        appAlert(
          i18n.t(result.alreadyExisted ? 'order.shipmentRecordExistsTitle' : 'order.shipmentRecordCreatedTitle'),
          i18n.t(result.alreadyExisted ? 'order.shipmentRecordExists' : 'order.shipmentRecordCreated'),
        );
      },
    },
  );

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
    const order = shipDialog.order;
    if (!order) return;
    setShipDialog({ visible: false, order: null }); // §12: önce kapat,
    updateStatusMutation.mutate({ orderId: order.id, status: 'shipped' }); // sonra gönder.
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
