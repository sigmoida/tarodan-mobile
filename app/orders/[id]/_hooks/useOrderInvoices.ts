import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { sellerInvoiceApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { isTrustedDocumentUrl } from '@/lib/security/trustedDocumentUrl';
import { useOrderElogoInvoices } from '@/hooks/useOrderElogoInvoices';
import type { Notify } from '../_lib/types';

/** Yüklenebilecek fatura PDF'i için üst sınır (backend de sınırlıyor). */
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

/**
 * eLogo e-Archive documents (three per party, a list), the business seller invoice queries and
 * their view handlers. A digital order (`isDigital`: membership, boost; sold by the platform)
 * has no seller invoice, so it is neither fetched nor shown (web parity); its e-Archive documents
 * stay.
 */
export function useOrderInvoices(
  id: string,
  orderStatus: string | undefined,
  notify: Notify,
  isDigital: boolean,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Web kuralı: ödeme öncesi (`pending_payment` → UI `pending`) ve iptal
  // edilmiş siparişte fatura kartları yok. İade edilmiş siparişte belgeler
  // (iade belgesi dahil) görünmeye devam eder.
  const invoiceEnabled = !!id && !!orderStatus && orderStatus !== 'pending' && orderStatus !== 'cancelled';

  const elogo = useOrderElogoInvoices(id, invoiceEnabled, (message) => notify(message, 'danger'));

  const { data: sellerInvoice } = useQuery({
    queryKey: qk.orders.sellerInvoice(id),
    enabled: invoiceEnabled && !isDigital,
    queryFn: async () => {
      try {
        const res = await sellerInvoiceApi.status(id);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  const [downloadingSellerInvoice, setDownloadingSellerInvoice] = useState(false);
  const viewSellerInvoice = async () => {
    setDownloadingSellerInvoice(true);
    try {
      const res = await sellerInvoiceApi.download(id);
      const url = res.data?.url;
      if (!url) notify(t('order.invoiceNotFound'), 'danger');
      // Yalnız https + izinli host (`trustedDocumentUrl`); değilse "açılamadı".
      else if (!isTrustedDocumentUrl(url)) notify(t('order.invoiceOpenFailed'), 'danger');
      else await Linking.openURL(url);
    } catch {
      notify(t('order.invoiceOpenFailed'), 'danger');
    } finally {
      setDownloadingSellerInvoice(false);
    }
  };

  /** Kurumsal satıcı: siparişe fatura PDF'i yükle/değiştir (alıcıya mail gider). */
  const uploadSellerInvoiceMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      sellerInvoiceApi.upload(id, file),
    onSuccess: () => {
      notify(t('order.invoiceUploaded'), 'success');
      queryClient.invalidateQueries({ queryKey: qk.orders.sellerInvoice(id) });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      notify(typeof text === 'string' ? text : t('order.invoiceUploadFailed'), 'danger');
    },
  });

  const pickAndUploadSellerInvoice = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;
    if (asset.size != null && asset.size > MAX_INVOICE_BYTES) {
      notify(t('order.fileTooLarge'), 'danger');
      return;
    }

    uploadSellerInvoiceMutation.mutate({
      uri: asset.uri,
      name: asset.name || 'fatura.pdf',
      // Bazı cihazlarda mimeType boş gelir; backend PDF beklediği için sabitliyoruz.
      type: asset.mimeType || 'application/pdf',
    });
  };

  return {
    elogoInvoices: elogo.invoices,
    openElogoInvoice: elogo.openInvoice,
    openingElogoInvoiceId: elogo.openingId,
    elogoLoadFailed: elogo.loadFailed,
    /** Pull-to-refresh ve "Tekrar Dene" — e-Arşiv listesini yeniden çeker. */
    refreshElogoInvoices: elogo.refresh,
    sellerInvoice: isDigital ? null : sellerInvoice,
    viewSellerInvoice,
    downloadingSellerInvoice,
    pickAndUploadSellerInvoice,
    uploadingSellerInvoice: uploadSellerInvoiceMutation.isPending,
  };
}
