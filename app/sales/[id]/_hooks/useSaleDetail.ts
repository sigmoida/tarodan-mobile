import { Linking } from 'react-native';
import { openExternalUrlSafely } from '@/lib/security/openExternalUrl';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { ordersApi } from '@/lib/api';
import { useRefresh } from '@/hooks/useRefresh';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { orderCancelMessage } from '@/lib/shared/orderCancelMessage';
import { preparingDeadlineNoticeOf } from '@/lib/shared/preparingDeadline';
import { noteOrderKindFallback } from '@/lib/shared/orderKindFallback';
import { useTimingValues } from '@/hooks/useTimingPolicy';
import { useDeadlineNow } from '@/hooks/useDeadlineNow';
import { useOrderElogoInvoices } from '@/hooks/useOrderElogoInvoices';
import { toast } from '@/ui';
import { isDigitalOrder } from '@/types';
import type { Order } from '../_lib/types';
import { statusColor } from '../_lib/status';

/**
 * Sale-detail controller — owns the order query, refresh, derived display state
 * (cancel-normalized status + colours, shipment tracking/provider) and the
 * call/track Linking handlers. Lifted verbatim from the monolithic screen (app/CLAUDE.md › Worked examples).
 */
export function useSaleDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading, error, refetch } = useQuery<Order | null>({
    queryKey: qk.orders.saleDetail(String(id ?? '')),
    queryFn: async () => {
      if (!id) return null;
      const response = await ordersApi.getOne(id);
      const sale: Order | null = response.data?.data ?? response.data ?? null;
      if (sale) noteOrderKindFallback({ orderId: String(sale.id ?? id) }, [sale]);
      return sale;
    },
    enabled: !!id,
  });

  const timingValues = useTimingValues();
  const now = useDeadlineNow(order?.preparingDeadline);
  // e-Arşiv belgeleri (satıcıya da taraf başına üç belge kesilir) — web kuralı:
  // ödeme öncesi ve iptal edilmiş siparişte yok. Bu ekran API statüsünü okur.
  const elogo = useOrderElogoInvoices(
    String(id ?? ''),
    !!order && order.status !== 'pending_payment' && order.status !== 'cancelled',
    (message) => toast.error(message),
  );
  // Pull-to-refresh siparişle birlikte e-Arşiv listesini de yeniler.
  const { refreshing, onRefresh } = useRefresh(refetch, elogo.refresh);

  // İptal'de status 'refunded' olsa bile "İptal Edildi" göster (alıcı ile tutarlı).
  const displayStatus = order?.cancellationType === 'iptal' ? 'cancelled' : order?.status ?? '';
  const sc = statusColor(displayStatus);
  // Neden iptal edildi — alıcı ekranıyla aynı tek kaynak; bu ekranı yalnız satıcı görür.
  const cancelMessage = order && displayStatus === 'cancelled' ? orderCancelMessage(order, 'seller', t, timingValues) : null;
  // Kargoya verme son tarihi (uzatıldıysa "son süre") — okuyucu siparişin
  // `isSeller`/`isBuyer` bayraklarından (web); ikisi de yoksa not yok.
  const preparingNotice = order ? preparingDeadlineNoticeOf(order, now) : null;
  // A digital sale (membership, boost; the platform account is its seller) ships nothing: no
  // address, shipment or shipping line, and its virtual product has no listing page. Defensive:
  // a regular seller never sees one.
  const isDigital = isDigitalOrder(order);
  const shipmentSummary = order?.shipment;
  const shipmentProvider = shipmentSummary?.provider ?? shipmentSummary?.carrier;
  const isSurat = (shipmentProvider ?? '').toLowerCase() === 'surat';
  // İKİ NUMARA tek kaynaktan türetilir (CLAUDE.md › Principles): `cargoCode` gerçek Sürat kodu,
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
    void openExternalUrlSafely(shipmentView.trackingUrl);
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
    cancelMessage,
    preparingNotice,
    isDigital,
    elogo,
    shipmentView,
    shipmentProvider,
    isSurat,
    handleCall,
    handleTrack,
  };
}

export type SaleDetailController = ReturnType<typeof useSaleDetail>;
