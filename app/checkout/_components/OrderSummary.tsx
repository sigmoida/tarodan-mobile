import React from 'react';
import { View } from 'react-native';
import { Divider, ErrorState, Text } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';

/**
 * Ödeme detayı özeti — her adımda görünür.
 *
 * SÖZLEŞME: burada YALNIZCA `pricing.summary`'nin dört alanı basılır
 * (`productAmount` / `shippingAmount` / `serviceFeeAmount` / `total`). Sunucu
 * garantisi üç satırın toplamının `total`a birebir eşit olmasıdır (canlı ölçüm:
 * 619,92 + 50 + 84,40 = 754,32) — bu yüzden buraya BAŞKA bir para satırı
 * (indirim, KDV, vs.) eklenmez. Eklenirse satırlar toplamı tutmaz ve kullanıcı
 * ödeme ekranında açıklanamayan bir fark görür.
 *
 * `serviceFeeAmount` hizmet bedeli + TÜM alıcı hizmet KDV'sini içerir — ayrı bir
 * KDV satırı basılmaz. Uygulanan kuponun indirimi özet satırı DEĞİL, kupon
 * rozetinde bilgilendirme olarak gösterilir (bkz. `CouponInput`).
 *
 * Değer `null` ise (quote yüklenmedi / hata verdi) tutar yerine yer tutucu
 * basılır — yerel bir sayı uydurulmaz.
 */
export function OrderSummary({
  itemCount,
  productAmount,
  shippingCost,
  serviceFeeAmount,
  total,
  isError = false,
  onRetry,
}: {
  itemCount: number;
  productAmount: number | null;
  shippingCost: number | null;
  serviceFeeAmount: number | null;
  total: number | null;
  isError?: boolean;
  onRetry?: () => void;
}) {
  // Quote hata verdiyse tutar basma — çıkış yolu ver (paylaşılan primitive, §11).
  if (isError) {
    return (
      <View style={styles.orderSummary} testID="order-summary-error">
        <ErrorState
          title="Fiyat bilgisi alınamadı"
          message="Ödeme tutarı sunucudan alınamadı. Bağlantınızı kontrol edip tekrar deneyin."
          onRetry={onRetry}
        />
      </View>
    );
  }

  return (
    <View style={styles.orderSummary}>
      <Text style={styles.orderSummaryTitle}>Ödeme Detayı</Text>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>Ara Toplam ({itemCount} ürün)</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(productAmount)}</Text>
      </View>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>Kargo (Sürat)</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(shippingCost)}</Text>
      </View>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>Platform Hizmet Bedeli</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(serviceFeeAmount)}</Text>
      </View>
      <Divider style={{ marginVertical: 12 }} />
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderTotalLabel}>Toplam</Text>
        <Text style={styles.orderTotalValue}>{formatServerPrice(total)}</Text>
      </View>
    </View>
  );
}
