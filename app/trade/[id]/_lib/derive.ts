// trade + user'dan türetilen tüm görünüm değerleri — tek saf fonksiyon.
// (Ekran bunu bir kez çağırır; her türetmeyi JSX içinde tekrarlamaz.)
import type { Trade, TradeCashPayment, TradeItem, TradeShipment } from './types';
import type { TradePaymentQuote } from '@/lib/api';

export function deriveTradeView(
  trade: Trade,
  user: { id?: string } | null | undefined,
  /** `useTradePaymentQuote` sonucu. `null` = v1 (boş gövde), `undefined` = henüz yüklenmedi. */
  paymentQuote?: TradePaymentQuote | null,
) {
  const isInitiator = user?.id === trade.initiatorId;
  const isReceiver = user?.id === trade.receiverId;
  const otherParty = isInitiator
    ? { id: trade.receiverId, displayName: trade.receiverName || 'Kullanıcı' }
    : { id: trade.initiatorId, displayName: trade.initiatorName || 'Kullanıcı' };

  const tradeItems: TradeItem[] = Array.isArray(trade.items) ? trade.items : [];
  const initiatorItems =
    Array.isArray(trade.initiatorItems) && trade.initiatorItems.length
      ? trade.initiatorItems
      : tradeItems.filter((item) => item.side === 'initiator');
  const receiverItems =
    Array.isArray(trade.receiverItems) && trade.receiverItems.length
      ? trade.receiverItems
      : tradeItems.filter((item) => item.side === 'receiver');

  const myItems = isInitiator ? initiatorItems : receiverItems;
  const theirItems = isInitiator ? receiverItems : initiatorItems;

  const sideTotal = (items: TradeItem[]) =>
    items.reduce((sum, item) => sum + Number(item.valueAtTrade) * (Number(item.quantity) || 1), 0);

  const shipments: TradeShipment[] = trade.shipments ?? [];
  const uid = user?.id;
  const myToWarehouseShipment = uid
    ? shipments.find((s) => s.direction === 'to_warehouse' && s.senderUserId === uid)
    : undefined;
  const otherToWarehouseShipment = uid
    ? shipments.find((s) => s.direction === 'to_warehouse' && s.senderUserId && s.senderUserId !== uid)
    : undefined;
  const myFromWarehouseShipment = uid
    ? shipments.find((s) => s.direction === 'from_warehouse' && s.recipientUserId === uid)
    : undefined;
  const otherFromWarehouseShipment = uid
    ? shipments.find((s) => s.direction === 'from_warehouse' && s.recipientUserId && s.recipientUserId !== uid)
    : undefined;
  const myReturnShipment = uid
    ? shipments.find((s) => s.direction === 'return' && (s.recipientUserId === uid || s.senderUserId === uid))
    : undefined;

  const cashPay = trade.cashPayment ?? null;
  const cashPaid = cashPay?.status === 'completed';
  const cashCommission = Number(cashPay?.commission ?? trade.cashCommission ?? 0);
  const cashTotal = Number(cashPay?.totalAmount ?? 0);

  /**
   * v2 sinyali İKİ KAYNAKLI (delta 17 §1; 2026-08-09 ölçümüyle doğrulandı):
   *   1. kabul sonrası iki ödeme satırı,
   *   2. kabul öncesi dolu `payment-quote` — kabul edilmemiş v2 takas 0 satırlıdır,
   *      dolayısıyla yalnız satır sayısına bakmak onu v1 sayardı.
   * v1 kaydın işareti tersten de doğrulanır: tek satır + `commission > 0`.
   * Emin olunamadığında v1'de kalmak güvenli taraftır — kullanıcı eski ama
   * tutarlı bir görünüm görür.
   */
  const cashPayments: TradeCashPayment[] = Array.isArray(trade.cashPayments)
    ? trade.cashPayments
    : [];
  const isV2 = cashPayments.length >= 2 || paymentQuote != null;
  const myPaymentRow = uid ? (cashPayments.find((p) => p.payerId === uid) ?? null) : null;
  const theirPaymentRow = uid
    ? (cashPayments.find((p) => p.payerId && p.payerId !== uid) ?? null)
    : null;
  const myPaymentPending = myPaymentRow != null && myPaymentRow.status !== 'completed';
  const paidCount = cashPayments.filter((p) => p.status === 'completed').length;
  const totalCount = cashPayments.length;

  const myTrackingNumber = isInitiator ? trade.initiatorTrackingNumber : trade.receiverTrackingNumber;
  const theirTrackingNumber = isInitiator ? trade.receiverTrackingNumber : trade.initiatorTrackingNumber;

  return {
    isInitiator,
    isReceiver,
    otherParty,
    myItems,
    theirItems,
    myTotal: sideTotal(myItems),
    theirTotal: sideTotal(theirItems),
    myToWarehouseShipment,
    otherToWarehouseShipment,
    myFromWarehouseShipment,
    otherFromWarehouseShipment,
    myReturnShipment,
    cashPaid,
    cashCommission,
    cashTotal,
    myTrackingNumber,
    theirTrackingNumber,
    isV2,
    myPaymentRow,
    theirPaymentRow,
    myPaymentPending,
    paidCount,
    totalCount,
  };
}

export type TradeView = ReturnType<typeof deriveTradeView>;
