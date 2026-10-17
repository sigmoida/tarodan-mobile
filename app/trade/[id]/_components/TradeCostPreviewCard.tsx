import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { TradePaymentQuoteSide } from '@/lib/api';
import type { TFn } from '../_lib/types';

/**
 * Kabul ÖNCESİ canlı maliyet dökümü. Tutarlar tahminidir, kabul anında kilitlenir
 * (`cashPayments` snapshot'ı) — bunu `costPreviewHint` metni söyler.
 * `feeLines` denetim detayıdır ve BASILMAZ.
 *
 * `payment-quote` KABUL EDİLMİŞ takaslarda da dolu gövde döndürüyor (2026-08-09
 * ölçümü §4). Kilitli satır varken bu kartı çizmek, PayTR'nin fiilen çekeceği
 * snapshot tutarının (`TradePaymentsCard`) yanına canlı bir yeniden fiyatlama
 * koyar — tarife/kural değiştiyse kullanıcı iki farklı tutar görür ve "kabul
 * anında sabitlenir" ipucu, zaten sabitlenmiş bir takasta yanıltıcı olur.
 * Bu yüzden kapı burada, bileşenin içinde: kilitli satır varsa hiç çizme.
 */
export function TradeCostPreviewCard({
  mine,
  theirs,
  lockedPaymentCount,
}: {
  mine: TradePaymentQuoteSide | null;
  theirs: TradePaymentQuoteSide | null;
  /**
   * `view.totalCount` — kilitli `cashPayments` satır sayısı. ZORUNLU: varsayılanı
   * `0` olsaydı, prop'u geçirmeyi unutan yeni bir çağrı yeri sessizce "kilit yok"
   * dalına düşer ve kilitli bir takasın yanına canlı yeniden fiyatlama koyardı.
   * Kilit kavramı olmayan çağrı yerleri (yeni takas akışı) açıkça `0` geçer.
   */
  lockedPaymentCount: number;
}) {
  const { t } = useTranslation();
  if (!mine || !theirs) return null;
  if (lockedPaymentCount > 0) return null;

  return (
    <SectionCard title={t('trade.costPreviewTitle')} bodyStyle={styles.body}>
      <Side label={t('trade.costPreviewYou')} side={mine} t={t} />
      <Side label={t('trade.costPreviewThem')} side={theirs} t={t} />
      <Text variant="caption" tone="muted">{t('trade.costPreviewHint')}</Text>
    </SectionCard>
  );
}

function Side({
  label,
  side,
  t,
}: {
  label: string;
  side: TradePaymentQuoteSide;
  t: TFn;
}) {
  return (
    <View style={styles.side}>
      <Text variant="caption" style={styles.sideLabel}>{label}</Text>
      <Row label={t('trade.serviceFee')} amount={side.serviceFee} />
      <Row label={t('trade.shippingFee')} amount={side.shipping} />
      {side.cashDifference > 0 ? (
        <Row label={t('trade.cashDifferenceLine')} amount={side.cashDifference} />
      ) : null}
      <View style={styles.totalRow}>
        <Text variant="caption" style={styles.sideLabel}>{t('trade.paymentTotal')}</Text>
        <Text variant="body" style={styles.totalValue}>{formatPrice(side.total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption">{formatPrice(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing[3] },
  side: { gap: theme.spacing[1] },
  sideLabel: { fontWeight: theme.typography.fontWeight.semibold },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
    paddingTop: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  totalValue: { fontWeight: theme.typography.fontWeight.bold },
});
