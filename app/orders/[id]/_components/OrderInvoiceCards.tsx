import { useTranslation } from 'react-i18next';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Button, theme } from '@/ui';

const { colors } = theme;

/** eLogo e-Arşiv faturası — yalnız HAZIRSA. */
export function OrderElogoInvoiceCard({
  elogoInvoice,
  onView,
  downloading,
}: {
  elogoInvoice: any;
  onView: () => void;
  downloading: boolean;
}) {
  const { t } = useTranslation();
  if (!elogoInvoice?.id) return null;
  return (
    <Card variant="elevated" style={styles.card} testID="order-invoice-card">
      <Text variant="label" style={styles.sectionTitle}>{t('order.invoice')}</Text>
      <Text variant="caption" style={styles.hint}>
        Faturanız e-posta adresinize gönderildi
        {elogoInvoice.invoiceNumber ? ` · No: ${elogoInvoice.invoiceNumber}` : ''}
      </Text>
      <Button
        variant="outline"
        fullWidth
        onPress={onView}
        isLoading={downloading}
        disabled={downloading}
        title="Faturayı Görüntüle / İndir"
      />
    </Card>
  );
}

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
            title="Satıcı Faturasını Görüntüle / İndir"
          />
          {sellerInvoice.canUpload && (
            <Button
              variant="outline"
              fullWidth
              icon="document-attach-outline"
              onPress={onUpload}
              isLoading={uploading}
              disabled={uploading}
              title="Faturayı Değiştir"
              testID="seller-invoice-replace-button"
              style={{ marginTop: theme.spacing[2] }}
            />
          )}
        </>
      ) : sellerInvoice.canUpload ? (
        <>
          <Text variant="caption" style={styles.hint}>
            Alıcıya iletilmek üzere fatura PDF'i yükleyin (en fazla 10 MB).
          </Text>
          <Button
            variant="primary"
            fullWidth
            icon="document-attach-outline"
            onPress={onUpload}
            isLoading={uploading}
            disabled={uploading}
            title="Fatura Yükle"
            testID="seller-invoice-upload-button"
          />
        </>
      ) : (
        <Text variant="caption" style={{ color: colors.text.muted }}>
          Bu sipariş için henüz fatura yüklenmedi.
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
