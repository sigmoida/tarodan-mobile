import { useTranslation } from 'react-i18next';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Button, theme } from '@/ui';

const { colors } = theme;

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
    <Card variant="elevated" style={styles.card} testID="seller-invoice-card">
      <Text variant="label" style={styles.sectionTitle}>{t('order.sellerInvoice')}</Text>
      {sellerInvoice.invoice ? (
        <>
          <Text variant="caption" style={styles.hint}>{sellerInvoice.invoice.fileName}</Text>
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
              icon="document-attach-outline"
              onPress={onUpload}
              isLoading={uploading}
              disabled={uploading}
              title={t('order.replaceInvoice')}
              testID="seller-invoice-replace-button"
              style={{ marginTop: theme.spacing[2] }}
            />
          )}
        </>
      ) : sellerInvoice.canUpload ? (
        <>
          <Text variant="caption" style={styles.hint}>
            {t('order.uploadInvoicePdfNotice')}
          </Text>
          <Button
            variant="primary"
            fullWidth
            icon="document-attach-outline"
            onPress={onUpload}
            isLoading={uploading}
            disabled={uploading}
            title={t('order.uploadInvoicePdf')}
            testID="seller-invoice-upload-button"
          />
        </>
      ) : (
        <Text variant="caption" style={{ color: colors.text.muted }}>
          {t('order.noInvoiceUploadedYet')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[3] },
  sectionTitle: { marginBottom: theme.spacing[3], color: colors.text.heading },
  hint: { color: colors.text.muted, marginBottom: theme.spacing[2] },
});
