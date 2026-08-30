import { useTranslation } from 'react-i18next';
import React from 'react';
import { View } from 'react-native';
import { Divider, ErrorState, Text, theme } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import type { OrderQuoteFeeDiscount } from '@/lib/api';
import { styles } from '../_lib/styles';

/**
 * Ödeme detayı özeti — her adımda görünür.
 *
 * SÖZLEŞME: TOPLANAN satırlar `pricing.summary`'nin üç alanıdır
 * (`productAmount` / `shippingAmount` / `serviceFeeAmount`) ve toplamları
 * `total`a birebir eşittir (canlı ölçüm: 619,92 + 50 + 84,40 = 754,32). Buraya
 * dördüncü bir TOPLANAN satır eklenmez — eklenirse satırlar toplamı tutmaz ve
 * kullanıcı açıklanamayan bir fark görür.
 *
 * Kampanya satırları bu kuralı BOZMAZ, çünkü toplanan değil AÇIKLAYAN
 * satırlardır: `productAmount` ve `serviceFeeAmount` zaten indirimli tutarı
 * taşır, bu satırlar yalnız kazancın kaynağını söyler. Bunlar olmadan "2 al 1
 * öde" ya da bir bedel kampanyası, toplam düşerken etiketsiz eriyordu (web
 * 2026-08-13'te düzeltti). `feeDiscountTotal` bilinçli olarak TOPLAMIN ALTINDA
 * duruyor — yukarı konsaydı toplanan bir satır sanılırdı.
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
  quantityDiscount,
  feeDiscounts = [],
  feeDiscountTotal,
  isError = false,
  onRetry,
}: {
  itemCount: number;
  productAmount: number | null;
  shippingCost: number | null;
  serviceFeeAmount: number | null;
  total: number | null;
  /** Adet kampanyası kazancı — açıklama satırı, toplama girmez. */
  quantityDiscount?: number | null;
  /** Bedel kampanyalarının kalem dökümü — açıklama satırları. */
  feeDiscounts?: OrderQuoteFeeDiscount[];
  /** Bedel kampanyası toplamı — TOPLAMIN ALTINDA gösterilir. */
  feeDiscountTotal?: number | null;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  // Quote hata verdiyse tutar basma — çıkış yolu ver (paylaşılan primitive, §11).
  if (isError) {
    return (
      <View style={styles.orderSummary} testID="order-summary-error">
        <ErrorState
          title={t('cart.priceUnavailableTitle')}
          message={t('checkout.priceUnavailableRetryBody')}
          onRetry={onRetry}
        />
      </View>
    );
  }

  return (
    <View style={styles.orderSummary}>
      <Text style={styles.orderSummaryTitle}>{t('checkout.paymentDetail')}</Text>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>{t('checkout.subtotalWithCount', { count: itemCount })}</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(productAmount)}</Text>
      </View>
      {Number(quantityDiscount ?? 0) > 0 ? (
        <View style={styles.orderSummaryRow}>
          <Text style={[styles.orderSummaryLabel, savingsText]}>
            {t('checkout.quantityCampaignDiscount')}
          </Text>
          <Text style={[styles.orderSummaryValue, savingsText]}>
            −{formatServerPrice(quantityDiscount!)}
          </Text>
        </View>
      ) : null}
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>{t('checkout.shippingWithCarrier')}</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(shippingCost)}</Text>
      </View>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>{t('footer.platformServiceFee')}</Text>
        <Text style={styles.orderSummaryValue}>{formatServerPrice(serviceFeeAmount)}</Text>
      </View>
      {feeDiscounts.map((discount) => (
        <View key={`${discount.target}:${discount.name}`} style={styles.orderSummaryRow}>
          <Text style={[styles.orderSummaryLabel, savingsText]}>
            {discount.code ? `${discount.name} (${discount.code})` : discount.name}
          </Text>
          <Text style={[styles.orderSummaryValue, savingsText]}>
            −{formatServerPrice(discount.amount)}
          </Text>
        </View>
      ))}
      <Divider style={{ marginVertical: 12 }} />
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderTotalLabel}>{t('common.total')}</Text>
        <Text style={styles.orderTotalValue}>{formatServerPrice(total)}</Text>
      </View>
      {Number(feeDiscountTotal ?? 0) > 0 ? (
        <View style={styles.orderSummaryRow}>
          <Text style={[styles.orderSummaryLabel, savingsText]}>{t('checkout.campaignSavings')}</Text>
          <Text style={[styles.orderSummaryValue, savingsText]}>
            {formatServerPrice(feeDiscountTotal!)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Kazanç satırlarının rengi — lehte bir kalem olduğu görünsün. */
const savingsText = { color: theme.colors.success[700]! };
