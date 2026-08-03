import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { elogoInvoicesApi, sellerInvoiceApi } from '@/lib/api';
import { qk } from '@/lib/query';

/** Yüklenebilecek fatura PDF'i için üst sınır (backend de sınırlıyor). */
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

type Notify = (message: string, variant: 'success' | 'danger' | 'default') => void;

/** eLogo e-Arşiv + kurumsal satıcı faturası query'leri + görüntüleme handler'ları. */
export function useOrderInvoices(id: string, orderStatus: string | undefined, notify: Notify) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invoiceEnabled =
    !!id &&
    !!orderStatus &&
    orderStatus !== 'pending' &&
    orderStatus !== 'cancelled' &&
    orderStatus !== 'refunded';

  const { data: elogoInvoice } = useQuery({
    queryKey: qk.orders.elogoInvoice(id),
    enabled: invoiceEnabled,
    queryFn: async () => {
      try {
        const res = await elogoInvoicesApi.byOrder(id);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  const { data: sellerInvoice } = useQuery({
    queryKey: qk.orders.sellerInvoice(id),
    enabled: invoiceEnabled,
    queryFn: async () => {
      try {
        const res = await sellerInvoiceApi.status(id);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const viewInvoice = async () => {
    if (!elogoInvoice?.id) return;
    setDownloadingInvoice(true);
    try {
      const res = await elogoInvoicesApi.pdf(elogoInvoice.id);
      const url = res.data?.url;
      if (url) await Linking.openURL(url);
      else notify(t('order.invoiceNotReady'), 'danger');
    } catch {
      notify(t('order.invoiceOpenFailed'), 'danger');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const [downloadingSellerInvoice, setDownloadingSellerInvoice] = useState(false);
  const viewSellerInvoice = async () => {
    setDownloadingSellerInvoice(true);
    try {
      const res = await sellerInvoiceApi.download(id);
      const url = res.data?.url;
      if (url) await Linking.openURL(url);
      else notify(t('order.invoiceNotFound'), 'danger');
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
    elogoInvoice,
    sellerInvoice,
    viewInvoice,
    downloadingInvoice,
    viewSellerInvoice,
    downloadingSellerInvoice,
    pickAndUploadSellerInvoice,
    uploadingSellerInvoice: uploadSellerInvoiceMutation.isPending,
  };
}
