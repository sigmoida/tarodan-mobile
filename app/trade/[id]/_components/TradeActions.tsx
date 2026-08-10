import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { TradeAddressPicker } from '@/components/common';
import { formatPrice } from '@/utils/format';
import type { Trade, TradeCashPayment, TFn } from '../_lib/types';

const { colors } = theme;

export interface TradeActionHandlers {
  setTradeAddressId: (id: string | null) => void;
  handleAccept: () => void;
  acceptPending: boolean;
  openReject: () => void;
  rejectPending: boolean;
  handleCancel: () => void;
  cancelPending: boolean;
  cashPay: () => void;
  cashPayPending: boolean;
  confirm: () => void;
  confirmPending: boolean;
  openDispute: () => void;
}

export function TradeActions({
  trade,
  id,
  t,
  isInitiator,
  isReceiver,
  userId,
  otherPartyId,
  cashPaid,
  cashTotal,
  isV2,
  myPaymentRow,
  myPaymentPending,
  paidCount,
  totalCount,
  myFromWarehouseStatus,
  hasShippedLeg,
  actions,
}: {
  trade: Trade;
  id: string;
  t: TFn;
  isInitiator: boolean;
  isReceiver: boolean;
  userId?: string;
  otherPartyId: string;
  cashPaid: boolean;
  cashTotal: number;
  isV2: boolean;
  myPaymentRow?: TradeCashPayment | null;
  myPaymentPending: boolean;
  paidCount: number;
  totalCount: number;
  myFromWarehouseStatus?: string | null;
  hasShippedLeg?: boolean;
  actions: TradeActionHandlers;
}) {
  // v1: mevcut cashTotal/cashCommission mantığı aynen korunur (para istemcide
  // hesaplanmaz — sunucu alanının aynısı). v2: kendi satırımın toplamı
  // sunucudan gelir (`myPaymentRow.totalAmount`); `amount + commission`
  // türetmesi v2'de yasak (delta 17 §1e).
  const payAmount = isV2
    ? Number(myPaymentRow?.totalAmount ?? 0)
    : Math.abs(cashTotal > 0 ? cashTotal : Number(trade.cashAmount ?? 0));
  const payTitle = `${t('payment.pay')} — ${formatPrice(payAmount)}`;
  return (
    <View style={styles.actions}>
      {/* Pending: Accept/Reject/Counter for receiver */}
      {trade.status === 'pending' && isReceiver && (
        <>
          <View style={{ marginBottom: theme.spacing[3] }}>
            <TradeAddressPicker label="Teslimat Adresi" onChange={actions.setTradeAddressId} />
          </View>
          <Button
            variant="primary"
            title="Kabul Et"
            onPress={actions.handleAccept}
            isLoading={actions.acceptPending}
            style={styles.actionButton}
          />
          <View style={styles.actionRow}>
            <Button
              variant="outline"
              title="Karşı Teklif"
              onPress={() => router.push(`/trade/counter/${id}` as any)}
              style={{ ...styles.actionButton, ...styles.actionItem }}
            />
            <Button
              variant="outline"
              title="Reddet"
              onPress={actions.openReject}
              isLoading={actions.rejectPending}
              style={{ ...styles.actionButton, ...styles.actionItem, borderColor: colors.danger[600]! }}
            />
          </View>
        </>
      )}

      {/* Cancel — backend-derived. Pending'de yalnızca teklifi yapan iptal edebilir. */}
      {trade.canCancel && (trade.status === 'pending' ? isInitiator : isInitiator || isReceiver) && (
        <Button
          variant="outline"
          title={trade.status === 'pending' ? t('trade.cancel.offerCta') : t('trade.cancel.tradeCta')}
          onPress={actions.handleCancel}
          isLoading={actions.cancelPending}
          style={{ ...styles.actionButton, borderColor: colors.danger[600]! }}
        />
      )}

      {/*
        Kargoya verildikten sonra iade `totalAmount − shippingAmount`'tır: nakit
        fark ve hizmet bedeli döner, KARGO DÖNMEZ (delta 17 §1f). Eşik, iptal
        kilidiyle aynı: "hâlâ iptal edebiliyorsan kargon da geri gelir."
      */}
      {isV2 && hasShippedLeg ? (
        <Text variant="caption" tone="muted">{t('trade.shippingNotRefundable')}</Text>
      ) : null}

      {/* Cancel locked hint */}
      {!trade.canCancel &&
        trade.status === 'shipping_to_warehouse' &&
        trade.firstWarehouseArrivalAt &&
        (isInitiator || isReceiver) && (
          <Text variant="caption" style={styles.confirmReceiptHint}>{t('trade.cancel.lockedHint')}</Text>
        )}

      {/*
        v2: kapı KENDİ satırımdır — eşit takasta bile iki taraf da öder, eski
        `cashPayerId === userId` kapısı v2'de yanlış (delta 17 §1e).
        v1: eski kapı aynen korunur, eldeki takaslar açıldıkları modelle biter.
      */}
      {(trade.status === 'accepted' || trade.status === 'awaiting_payment') &&
        (isV2 ? myPaymentPending : trade.cashPayerId === userId && !cashPaid) && (
          <View style={styles.payCta}>
            <Text variant="label" style={{ color: colors.primary[800]! }}>{t('payment.completeYourPayment')}</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing[0.5], marginBottom: theme.spacing[2.5] }}>
              {t('trade.completePaymentDesc')}
            </Text>
            <Button
              testID="cash-pay-button"
              variant="primary"
              title={payTitle}
              onPress={actions.cashPay}
              isLoading={actions.cashPayPending}
              disabled={actions.cashPayPending}
              style={styles.actionButton}
            />
          </View>
        )}

      {/*
        "1/2 ödendi" TAKILMA DEĞİL: kendi ödemem geçti, karşı tarafınki bekliyor.
        Takas `shipping_to_warehouse`'a ancak iki satır da completed olunca geçer.
      */}
      {(trade.status === 'accepted' || trade.status === 'awaiting_payment') &&
        (isV2
          ? !myPaymentPending && paidCount < totalCount
          : Boolean(trade.cashPayerId) && trade.cashPayerId !== userId && !cashPaid) && (
          <Text variant="caption" style={styles.confirmReceiptHint}>
            {t('trade.waitingCounterpartyPayment')}
          </Text>
        )}

      {/* shipping_to_recipients: Confirm receipt (gated by delivered status) */}
      {trade.status === 'shipping_to_recipients' && (isInitiator || isReceiver) && (
        <>
          <Button
            testID="trade-confirm-delivery-button"
            variant="primary"
            title="Teslim Aldım"
            onPress={actions.confirm}
            isLoading={actions.confirmPending}
            disabled={myFromWarehouseStatus !== 'delivered'}
            style={styles.actionButton}
          />
          {myFromWarehouseStatus !== 'delivered' && (
            <Text variant="caption" style={styles.confirmReceiptHint}>{t('trade.confirmReceipt.waitingDelivered')}</Text>
          )}
          <Button
            testID="trade-raise-dispute-button"
            variant="outline"
            title={t('trade.dispute.openCta')}
            onPress={actions.openDispute}
            style={{ ...styles.actionButton, borderColor: colors.danger[600]! }}
          />
          <Text variant="caption" style={styles.confirmReceiptHint}>{t('trade.dispute.hint')}</Text>
        </>
      )}

      {/* Message other party */}
      <Button
        variant="ghost"
        title="Mesaj Gönder"
        onPress={() => router.push(`/messages/new?receiverId=${otherPartyId}`)}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { padding: theme.spacing[4], gap: theme.spacing[3] },
  actionButton: { borderRadius: theme.radius.xl, alignSelf: 'stretch' },
  actionRow: { flexDirection: 'row', gap: theme.spacing[3] },
  actionItem: { flex: 1 },
  confirmReceiptHint: { color: colors.text.muted, textAlign: 'center', marginTop: theme.spacing[1] },
  payCta: {
    backgroundColor: colors.primary[50]!,
    borderWidth: 1,
    borderColor: colors.primary[100]!,
    borderRadius: 12,
    padding: theme.spacing[3.5],
  },
});
