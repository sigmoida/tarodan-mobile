import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
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
          existing = unwrapEnvelope<Shipment>(res) ?? null;
        } catch (error: any) {
          if (error?.response?.status !== 404) throw error;
        }
        if (existing) return existing;
        // ONARIM yolu: kayıt yok. Sunucu durum kapısını kendi uyguluyor.
        const created = await shippingApi.createShipment({ orderId, provider: 'surat' });
        return unwrapEnvelope<Shipment>(created) ?? null;
      }
      throw new Error(`Desteklenmeyen sipariş durumu: ${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
      setShipDialog({ visible: false, order: null });
      appAlert('Başarılı', 'Sipariş durumu güncellendi');
    },
    onError: (e: any) => {
      appAlert('Hata', e?.response?.data?.message || e?.message || 'Durum güncellenemedi');
    },
  });

  const handleMarkAsProcessing = (order: Sale) => {
    appAlert(
      'Siparişi Hazırlıyor Olarak İşaretle',
      'Siparişi hazırlamaya başladığınızı onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
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
