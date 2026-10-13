import { useTranslation } from 'react-i18next';
import React from 'react';
import { View } from 'react-native';
import { ErrorState, Text, theme } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import type { OrderQuoteFeeDiscount } from '@/lib/api';
import { styles } from '../_lib/styles';

/**
 * Ödeme özeti satırları (web `OrderSummaryLines`): Ürün ücreti · Kargo ücreti · Hizmet Bedeli,
 * altta Toplam. Kargo firması adı etikete GÖMÜLMEZ (web gibi).
 *
 * SÖZLEŞME: TOPLANAN satırlar `pricing.summary`'nin üç alanıdır (`productAmount` /
 * `shippingAmount` / `serviceFeeAmount`) ve toplamları `total`a birebir eşittir (canlı ölçüm:
 * 619,92 + 50 + 84,40 = 754,32). Buraya dördüncü bir TOPLANAN satır eklenmez — eklenirse satırlar
 * toplamı tutmaz ve kullanıcı açıklanamayan bir fark görür.
 *
 * Kampanya satırları bu kuralı BOZMAZ, çünkü toplanan değil AÇIKLAYAN satırlardır:
 * `productAmount` ve `serviceFeeAmount` zaten indirimli tutarı taşır, bu satırlar yalnız kazancın
 * kaynağını söyler (web 2026-08-13). `feeDiscountTotal` bilinçli olarak TOPLAMIN ALTINDA durur —
 * yukarı konsaydı toplanan bir satır sanılırdı.
 *
 * `serviceFeeAmount` hizmet bedeli + TÜM alıcı hizmet KDV'sini içerir — ayrı KDV satırı basılmaz.
 * Uygulanan kuponun indirimi özet satırı DEĞİL, kupon rozetinde bilgilendirmedir (`CouponInput`).
 *
 * Değer `null` ise (quote yüklenmedi / hata verdi) tutar yerine yer tutucu basılır — yerel bir
 * sayı uydurulmaz.
 */
export function OrderSummary({
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
      <View testID="order-summary-error">
        <ErrorState
          title={t('cart.priceUnavailableTitle')}
          message={t('checkout.priceUnavailableRetryBody')}
          onRetry={onRetry}
        />
      </View>
    );
  }

  return (
    <View style={styles.lines} testID="order-summary">
      <SummaryLine label={t('checkout.productFee')} value={formatServerPrice(productAmount)} />
      {Number(quantityDiscount ?? 0) > 0 ? (
        <SummaryLine
          label={t('checkout.quantityCampaignDiscount')}
          value={`−${formatServerPrice(quantityDiscount!)}`}
          savings
        />
      ) : null}
      <SummaryLine label={t('checkout.shippingFee')} value={formatServerPrice(shippingCost)} />
      <SummaryLine label={t('checkout.serviceFee')} value={formatServerPrice(serviceFeeAmount)} />
      {feeDiscounts.map((discount) => (
        <SummaryLine
          key={`${discount.target}:${discount.name}`}
          label={discount.code ? `${discount.name} (${discount.code})` : discount.name}
          value={`−${formatServerPrice(discount.amount)}`}
          savings
        />
      ))}
      <View style={styles.rule} />
      <View style={styles.line}>
        <Text variant="h3" tone="heading">{t('checkout.total')}</Text>
        <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>
          {formatServerPrice(total)}
        </Text>
      </View>
      {Number(feeDiscountTotal ?? 0) > 0 ? (
        <SummaryLine
          label={t('checkout.campaignSavings')}
          value={formatServerPrice(feeDiscountTotal!)}
          savings
        />
      ) : null}
    </View>
  );
}

/** Tek özet satırı: etiket solda (muted), tutar sağda (medium). Kazanç satırları success tonunda. */
function SummaryLine({ label, value, savings = false }: { label: string; value: string; savings?: boolean }) {
  const color = savings ? theme.colors.success[600]! : undefined;
  return (
    <View style={styles.line}>
      <Text variant="bodySm" tone="muted" style={[{ flex: 1 }, color ? { color } : null]}>{label}</Text>
      <Text variant="bodySm" weight="medium" style={color ? { color } : undefined}>{value}</Text>
    </View>
  );
}
