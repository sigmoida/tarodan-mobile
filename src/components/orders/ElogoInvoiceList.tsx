import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Text, theme } from '@/ui';
import type { ElogoInvoice } from '@/lib/api';

const { colors, radius } = theme;

/**
 * e-Arşiv belgeleri — HER HİZMET İÇİN AYRI belge kesilir (komisyon, hizmet
 * bedeli, kargo payı), bu yüzden kart tek değil listedir (web
 * `InvoicesSection`). Belge yoksa hiçbir şey çizmez; liste yüklenemediyse
 * hata satırı ve "Tekrar Dene" çizer.
 */
export function ElogoInvoiceList({
  invoices,
  onOpen,
  openingId,
  loadFailed = false,
  onRetry,
  style,
}: {
  invoices: ElogoInvoice[];
  onOpen: (invoiceId: string) => void;
  /** Açılmakta olan belge — yalnız o satırın düğmesi bekler. */
  openingId: string | null;
  /** Liste yüklenemedi → hata satırı + "Tekrar Dene" (boş liste ile karışmaz). */
  loadFailed?: boolean;
  onRetry?: () => void;
  /** Ekranın kart stiline uydurmak için (ör. satış detayı `gap` kullanır). */
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  if (loadFailed && invoices.length === 0) {
    return (
      <Card variant="elevated" style={[styles.card, style]} testID="order-invoice-card">
        <Text variant="label" style={styles.sectionTitle}>{t('order.invoice')}</Text>
        <View style={styles.row} testID="order-invoice-load-failed">
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger[600]!} />
          <Text style={styles.rowBody}>{t('order.invoiceListLoadFailed')}</Text>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onPress={onRetry}
              title={t('common.tryAgain')}
              testID="order-invoice-retry"
            />
          ) : null}
        </View>
      </Card>
    );
  }
  if (invoices.length === 0) return null;
  return (
    <Card variant="elevated" style={[styles.card, style]} testID="order-invoice-card">
      <Text variant="label" style={styles.sectionTitle}>{t('order.invoice')}</Text>
      <Text variant="caption" style={styles.hint}>{t('order.invoiceSentToEmail')}</Text>
      {invoices.map((invoice) => {
        const opening = openingId === invoice.id;
        return (
          <View key={invoice.id} style={styles.row} testID={`order-invoice-row-${invoice.id}`}>
            <Ionicons name="mail-outline" size={20} color={colors.success[600]!} />
            <View style={styles.rowBody}>
              <Text numberOfLines={1}>{invoice.label}</Text>
              {invoice.invoiceNumber ? (
                <Text variant="caption" tone="muted">
                  {t('order.invoiceNo') + invoice.invoiceNumber}
                </Text>
              ) : null}
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => onOpen(invoice.id)}
              isLoading={opening}
              disabled={opening}
              title={t('order.viewDownloadInvoice')}
              testID={`order-invoice-open-${invoice.id}`}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[3] },
  sectionTitle: { marginBottom: theme.spacing[3], color: colors.text.heading },
  hint: { color: colors.text.muted, marginBottom: theme.spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    marginTop: theme.spacing[2],
    backgroundColor: colors.surface.alt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowBody: { flex: 1, minWidth: 0 },
});
