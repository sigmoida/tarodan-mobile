import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { elogoInvoicesApi, type ElogoInvoice } from '@/lib/api';
import { qk } from '@/lib/query';

const NOT_READY = 'not-ready';

/**
 * Siparişin e-Arşiv belgeleri — alıcı sipariş detayı ve satıcı satış detayı
 * ortak kullanır (web `useElogoInvoices` + `useDownloadElogoInvoice` aynası).
 *
 * Taraf başına ÜÇ belge kesildiği için tekil değil LİSTE okunur. Açma durumu
 * SATIR bazlıdır (`openingId` = mutasyonun `variables`'ı): tek bir bayrak
 * tıklanmayan belgelerin düğmesini de kilitliyordu.
 *
 * `enabled`: ödeme öncesi / iptal edilmiş siparişte istek atılmaz (web kuralı;
 * çağıran kendi statü adlarıyla hesaplar). `onError`: ekranın geri bildirimi.
 */
export function useOrderElogoInvoices(
  orderId: string,
  enabled: boolean,
  onError: (message: string) => void,
) {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: qk.orders.elogoInvoices(orderId),
    enabled: !!orderId && enabled,
    queryFn: async (): Promise<ElogoInvoice[]> => {
      try {
        const res = await elogoInvoicesApi.byOrderAll(orderId);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const open = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await elogoInvoicesApi.pdf(invoiceId);
      const url = res.data?.url;
      if (!url) throw new Error(NOT_READY);
      await Linking.openURL(url);
    },
    onError: (err: unknown) => {
      if ((err as Error)?.message === NOT_READY) {
        onError(t('order.invoiceNotReady'));
        return;
      }
      onError(t('order.invoiceOpenFailed'));
    },
  });

  return {
    invoices: enabled ? (data ?? []) : [],
    openInvoice: (invoiceId: string) => open.mutate(invoiceId),
    openingId: open.isPending ? (open.variables ?? null) : null,
  };
}
