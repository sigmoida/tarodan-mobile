import { useTranslation } from 'react-i18next';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SectionCard, Text, Button, theme } from '@/ui';

/** Kurumsal satıcı faturası (elle yüklenen PDF). */
export function OrderSellerInvoiceCard({
  sellerInvoice,
  onView,
  downloading,
  onUpload,
  uploading,
}: {
  sellerInvoice: any;
  onView: () => void;
  downloading: boolean;
  onUpload: () => void;
  uploading: boolean;
}) {
  const { t } = useTranslation();
  if (!(sellerInvoice && (sellerInvoice.invoice || (sellerInvoice.canUpload && sellerInvoice.isSeller)))) return null;
  return (
    <SectionCard title={t('order.sellerInvoice')} testID="seller-invoice-card" bodyStyle={styles.stack}>
      {sellerInvoice.invoice ? (
        <>
          <Text variant="bodySm" tone="muted">{sellerInvoice.invoice.fileName}</Text>
          <Button
            variant="outline"
            fullWidth
            onPress={onView}
            isLoading={downloading}
            disabled={downloading}
            title={t('order.viewDownloadSellerInvoice')}
          />
          {sellerInvoice.canUpload && (
            <Button
              variant="outline"
              fullWidth
              onPress={onUpload}
              isLoading={uploading}
              disabled={uploading}
              title={t('order.replaceInvoice')}
              testID="seller-invoice-replace-button"
            />
          )}
        </>
      ) : sellerInvoice.canUpload ? (
        <>
          <Text variant="bodySm" tone="muted">{t('order.uploadInvoicePdfNotice')}</Text>
          <Button
            variant="primary"
            fullWidth
            onPress={onUpload}
            isLoading={uploading}
            disabled={uploading}
            title={t('order.uploadInvoicePdf')}
            testID="seller-invoice-upload-button"
          />
        </>
      ) : (
        <Text variant="bodySm" tone="muted">{t('order.noInvoiceUploadedYet')}</Text>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing[2] },
});
