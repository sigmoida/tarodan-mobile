import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { TradeCashPayment, TFn } from '../_lib/types';
import type { TradeView } from '../_lib/derive';

/**
 * Takas v2: İKİ TARAF DA öder. Her satır
 * `hizmet bedeli + kargo + nakit fark = toplam`. Komisyon satırı v2'de YOKTUR
 * (`commission` her zaman 0) ve `amount + commission` türetmesi burada hiç geçmez —
 * her tutar sunucu alanının aynısıdır.
 */
export function TradePaymentsCard({
  view,
  otherPartyName,
}: {
  view: TradeView;
  otherPartyName: string;
}) {
  const { t } = useTranslation();
  // Kabul EDİLMEMİŞ v2 takas `isV2` olur ama 0 satırlıdır: kapı yalnız `isV2`
  // olsaydı başlık + "0/0 ödeme tamamlandı" yazan boş bir kabuk çizilirdi.
  // Kilitli satır yokken ekranı `TradeCostPreviewCard` doldurur (tamamlayıcı
  // kapı: satır varsa bu kart, yoksa önizleme kartı).
  if (!view.isV2 || (!view.myPaymentRow && !view.theirPaymentRow)) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" style={styles.title}>{t('trade.paymentsTitle')}</Text>
        <Text variant="caption" tone="muted">
          {t('trade.paymentsProgress', { paid: view.paidCount, total: view.totalCount })}
        </Text>
      </View>
      <Text variant="caption" tone="muted" style={styles.desc}>{t('trade.bothMustPay')}</Text>

      <PaymentRow label={t('trade.yourPayment')} row={view.myPaymentRow} t={t} />
      <PaymentRow label={t('trade.theirPayment', { name: otherPartyName })} row={view.theirPaymentRow} t={t} />
    </Card>
  );
}

function PaymentRow({
  label,
  row,
  t,
}: {
  label: string;
  row: TradeCashPayment | null;
  t: TFn;
}) {
  if (!row) return null;
  const statusKey =
    row.status === 'completed' ? 'trade.paymentPaid'
    : row.status === 'refunded' ? 'trade.paymentRefunded'
    : 'trade.paymentPending';

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="caption" style={styles.rowLabel}>{label}</Text>
        <Text variant="caption" tone="muted">{t(statusKey as any)}</Text>
      </View>
      <Line label={t('trade.serviceFee')} amount={row.tradeFeeAmount} />
      <Line label={t('trade.shippingFee')} amount={row.shippingAmount} />
      {/* Nakit fark yalnız borçlu tarafta anlamlı; 0 satırı gürültü olur. */}
      {Number(row.amount ?? 0) > 0 ? (
        <Line label={t('trade.cashDifferenceLine')} amount={row.amount} />
      ) : null}
      <View style={styles.totalLine}>
        <Text variant="caption" style={styles.rowLabel}>{t('trade.paymentTotal')}</Text>
        <Text variant="body" style={styles.totalValue}>{formatPrice(Number(row.totalAmount ?? 0))}</Text>
      </View>
    </View>
  );
}

/** Hizmet bedeli 0 olabilir (admin henüz girmemiş) — 0 TL meşru, satır yine çizilir. */
function Line({ label, amount }: { label: string; amount?: number }) {
  if (amount == null) return null;
  return (
    <View style={styles.line}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption">{formatPrice(Number(amount))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: theme.spacing[4], marginTop: theme.spacing[0], backgroundColor: theme.colors.surface.DEFAULT },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '600' },
  desc: { marginTop: theme.spacing[1] },
  row: { marginTop: theme.spacing[3], gap: theme.spacing[1] },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing[1] },
  rowLabel: { fontWeight: '600' },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
    paddingTop: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  totalValue: { fontWeight: 'bold' },
});
