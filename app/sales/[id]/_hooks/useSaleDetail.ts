import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { useRefresh } from '@/hooks/useRefresh';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import type { Order } from '../_lib/types';
import { statusColor } from '../_lib/status';

/**
 * Sale-detail controller — owns the order query, refresh, derived display state
 * (cancel-normalized status + colours, shipment tracking/provider) and the
 * call/track Linking handlers. Lifted verbatim from the monolithic screen (§12).
 */
export function useSaleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading, error, refetch } = useQuery<Order | null>({
    queryKey: ['sale-order', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await ordersApi.getOne(id);
      return response.data?.data ?? response.data ?? null;
    },
    enabled: !!id,
  });

  const { refreshing, onRefresh } = useRefresh(refetch);

  // İptal'de status 'refunded' olsa bile "İptal Edildi" göster (alıcı ile tutarlı).
  const displayStatus = order?.cancellationType === 'iptal' ? 'cancelled' : order?.status ?? '';
  const sc = statusColor(displayStatus);
  const shipmentSummary = order?.shipment;
  const shipmentProvider = shipmentSummary?.provider ?? shipmentSummary?.carrier;
  const isSurat = (shipmentProvider ?? '').toLowerCase() === 'surat';
  // İKİ NUMARA tek kaynaktan türetilir (§5): `cargoCode` gerçek Sürat kodu,
  // `trackingNumber` yalnız şubede verilecek iç referans. Sipariş özeti kodu
  // `cargoCode` adıyla taşıdığı için yedek parametreye de o geçilir.
  const shipmentView = deriveShipmentView(
    shipmentSummary ? { ...shipmentSummary, provider: shipmentProvider } : null,
    shipmentSummary?.cargoCode,
  );

  const handleCall = () => {
    if (order?.buyer?.phone) {
      Linking.openURL(`tel:${order.buyer.phone}`);
    }
  };

  // Link ELLE KURULMAZ — iç referansla kurulan link Sürat'ta "böyle bir gönderi
  // yok" veriyordu. `deriveShipmentView` yalnız gerçek koddan URL üretir.
  const handleTrack = () => {
    if (!shipmentView.trackingUrl) return;
    Linking.openURL(shipmentView.trackingUrl);
  };

  return {
    order,
    isLoading,
    error,
    refetch,
    refreshing,
    onRefresh,
    displayStatus,
    sc,
    shipmentView,
    shipmentProvider,
    isSurat,
    handleCall,
    handleTrack,
  };
}

export type SaleDetailController = ReturnType<typeof useSaleDetail>;
