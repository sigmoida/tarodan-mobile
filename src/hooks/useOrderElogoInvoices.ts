import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { elogoInvoicesApi, type ElogoInvoice } from '@/lib/api';
import { qk } from '@/lib/query';
import { isTrustedDocumentUrl } from '@/lib/security/trustedDocumentUrl';

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
 * çağıran kendi statü adlarıyla hesaplar). `onError`: PDF açma hatasının
 * geri bildirimi. Liste hatası `loadFailed` ile kartta satır olarak gösterilir
 * (web hatayı `[]`'a çeviriyor — web'e de önerilir). `refresh`: ekranın
 * pull-to-refresh'i sipariş sorgusuyla birlikte bunu da çağırır.
 */
export function useOrderElogoInvoices(
  orderId: string,
  enabled: boolean,
  onError: (message: string) => void,
) {
  const { t } = useTranslation();

  const active = !!orderId && enabled;
  // Hata `[]`'a çevrilmez: "belge yok" ile "yüklenemedi" ayrı durumlardır
  // (uç belge yoksa zaten `[]` döner). Hata satırı + "Tekrar Dene" çizilir.
  const query = useQuery({
    queryKey: qk.orders.elogoInvoices(orderId),
    enabled: active,
    queryFn: async (): Promise<ElogoInvoice[]> => {
      const res = await elogoInvoicesApi.byOrderAll(orderId);
      return Array.isArray(res.data) ? res.data : [];
    },
  });
  // Pull-to-refresh / tekrar dene: kapalı sorgu (ödeme öncesi / iptal)
  // `refetch` ile zorla çekilmesin.
  const refresh = () => (active ? query.refetch() : Promise.resolve());

  const open = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await elogoInvoicesApi.pdf(invoiceId);
      const url = res.data?.url;
      if (!url) throw new Error(NOT_READY);
      // Sunucunun verdiği adres yalnız https + izinli host ise açılır (`trustedDocumentUrl`);
      // değilse genel "açılamadı" hatası.
      if (!isTrustedDocumentUrl(url)) throw new Error('untrusted-document-url');
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
    invoices: enabled ? (query.data ?? []) : [],
    /** Liste hiç yüklenemedi (eldeki eski liste varsa o gösterilir). */
    loadFailed: active && query.isError && !query.data,
    refresh,
    openInvoice: (invoiceId: string) => open.mutate(invoiceId),
    openingId: open.isPending ? (open.variables ?? null) : null,
  };
}
