// trade + user'dan türetilen tüm görünüm değerleri — tek saf fonksiyon.
// (Ekran bunu bir kez çağırır; her türetmeyi JSX içinde tekrarlamaz.)
import type { Trade, TradeCashPayment, TradeItem, TradeShipment } from './types';
import type { TradePaymentQuote } from '@/lib/api';
import { isShipmentDispatched } from './status';
// ⚠️ Saf fonksiyon — React DIŞI, `useTranslation` çağıramaz. Global `i18n`
// örneğinden ÇAĞRI ANINDA okunur (bkz. `src/lib/payment/paytrDirectForm.ts`),
// import anında DONMASIN diye modül kapsamında değil fonksiyon içinde okunur.
import i18n from '@/i18n/config';

export function deriveTradeView(
  trade: Trade,
  user: { id?: string } | null | undefined,
  /** `useTradePaymentQuote` sonucu. `null` = v1 (boş gövde), `undefined` = henüz yüklenmedi. */
  paymentQuote?: TradePaymentQuote | null,
) {
  const isInitiator = user?.id === trade.initiatorId;
  const isReceiver = user?.id === trade.receiverId;
  const otherParty = isInitiator
    ? { id: trade.receiverId, displayName: trade.receiverName || i18n.t('common.user') }
    : { id: trade.initiatorId, displayName: trade.initiatorName || i18n.t('common.user') };

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
  /**
   * Ödeme CTA'sının kapısı: SADECE `pending` satır ödenmeyi bekler.
   * `!== 'completed'` yazmak `refunded` (2026-08-09 ölçümü §3'te gerçek bir kayıt
   * var) ve ileride eklenebilecek `failed`/`cancelled` gibi terminal statüleri de
   * "bekliyor" sayıp iptal/iade edilmiş bir takasta ödeme butonunu yeniden açardı.
   */
  const myPaymentPending = myPaymentRow?.status === 'pending';
  const paidCount = cashPayments.filter((p) => p.status === 'completed').length;
  const totalCount = cashPayments.length;

  /**
   * İlerleme çubuğunda "Ödeme" adımı var mı? v2'de EŞİT takasta bile iki taraf
   * öder (`cashAmount: 0` olsa da ödeme aşaması vardır) — v1'in `cashAmount > 0`
   * kapısı burada yanlış sonuç verir ve `awaiting_payment` adım listesinde
   * bulunamayınca çubuk yanlış adımı aktif gösterirdi. v1'de eski kapı korunur.
   */
  const hasPaymentStep = isV2 || Number(trade.cashAmount ?? 0) > 0;

  /**
   * İptal edilirse kargo bedeli iade edilmez uyarısının eşiği (delta 17 §1f).
   * Shipment kaydı ödeme tamamlanır tamamlanmaz `pending` statüsüyle otomatik
   * oluşuyor — henüz taşıyıcıya teslim edilmemiş; bu yüzden salt shipment
   * VARLIĞINA değil, `isShipmentDispatched` ile fiilen yola çıkmış olmasına
   * bakılır (tek kaynak: `_lib/status.ts`, `renderOtherShipmentHint` da aynı
   * yardımcıyı kullanır). `trade.firstWarehouseArrivalAt` de dahil: depoya
   * varmışsa taşıyıcıya zaten teslim edilmiş demektir, bu yüzden dispatched
   * sayılır (ör. shipment kaydı eksik/gecikmeliyse bile).
   */
  const hasShippedLeg = Boolean(
    isShipmentDispatched(myToWarehouseShipment?.status) || trade.firstWarehouseArrivalAt,
  );

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
    hasPaymentStep,
    hasShippedLeg,
  };
}

export type TradeView = ReturnType<typeof deriveTradeView>;
