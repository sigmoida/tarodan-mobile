import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text, theme } from '@/ui';
import { formatServerPrice } from '@/utils/format';
import type { OrderQuoteFeeDiscount } from '@/lib/api';

const { colors, spacing } = theme;

export interface OrderSummaryLinesProps {
  productAmount: number | null;
  shippingAmount: number | null;
  serviceFeeAmount: number | null;
  total: number | null;
  /** Adet kampanyası kazancı — açıklama satırı, toplama girmez. */
  quantityDiscount?: number | null;
  /** Bedel kampanyalarının kalem dökümü — açıklama satırları. */
  feeDiscounts?: OrderQuoteFeeDiscount[];
  /** Bedel kampanyası toplamı — TOPLAMIN ALTINDA gösterilir. */
  feeDiscountTotal?: number | null;
  /** Toplam tutar metninin testID'si (sepet ve ödeme ayrı testlerde okur). */
  totalTestID?: string;
  testID?: string;
}

/**
 * Sipariş özeti satırları — sepet ve ödeme için TEK bileşen (web `OrderSummaryLines`).
 * Sıra ve etiketler web'le aynı: Ürün ücreti · [adet kampanyası] · Kargo ücreti · Hizmet Bedeli ·
 * [kampanya satırları] · ayraç · Toplam · [Toplam kazancınız]. Kargo firması adı etikete gömülmez.
 *
 * SÖZLEŞME: tutarların HİÇBİRİ burada hesaplanmaz — hepsi `POST /orders/quote`'un
 * `pricing.summary`'sinden aynen gelir ve üç satırın toplamı `total`'a birebir eşittir
 * (canlı ölçüm: 619,92 + 50 + 84,40 = 754,32). Buraya dördüncü bir TOPLANAN satır eklenmez.
 * Kampanya satırları toplanan değil AÇIKLAYAN satırlardır (`productAmount`/`serviceFeeAmount`
 * indirimli tutarı zaten taşır); `feeDiscountTotal` bilinçli olarak TOPLAMIN ALTINDADIR.
 * `serviceFeeAmount` hizmet bedeli + TÜM alıcı hizmet KDV'sini içerir — ayrı KDV satırı yok.
 *
 * Değer `null` ise (quote yüklenmedi / hata verdi) tutar yerine yer tutucu basılır — yerel bir
 * sayı uydurulmaz.
 */
export function OrderSummaryLines({
  productAmount,
  shippingAmount,
  serviceFeeAmount,
  total,
  quantityDiscount,
  feeDiscounts = [],
  feeDiscountTotal,
  totalTestID,
  testID,
}: OrderSummaryLinesProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.lines} testID={testID}>
      <SummaryLine label={t('checkout.productFee')} value={formatServerPrice(productAmount)} />
      {Number(quantityDiscount ?? 0) > 0 ? (
        <SummaryLine
          label={t('checkout.quantityCampaignDiscount')}
          value={`−${formatServerPrice(quantityDiscount!)}`}
          savings
        />
      ) : null}
      <SummaryLine label={t('checkout.shippingFee')} value={formatServerPrice(shippingAmount)} />
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
        <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }} testID={totalTestID}>
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
  const color = savings ? colors.success[600]! : undefined;
  return (
    <View style={styles.line}>
      <Text variant="bodySm" tone="muted" style={[styles.label, color ? { color } : null]}>
        {label}
      </Text>
      <Text variant="bodySm" weight="medium" style={color ? { color } : undefined}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing[3] },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  label: { flex: 1 },
  rule: { height: 1, backgroundColor: colors.border.DEFAULT },
});
