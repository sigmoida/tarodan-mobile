// Takas detay route'unun DTO tipleri.
import type { TFunction } from "i18next";

export interface TradeShipment {
  id: string;
  direction: "to_warehouse" | "from_warehouse" | "return" | string;
  senderUserId?: string | null;
  recipientUserId?: string | null;
  trackingNumber?: string | null;
  status?: string | null;
  carrier?: string | null;
}

export interface TradeCashPayment {
  id?: string;
  /** v2: bu satırı ödeyen taraf. v1 tekil kayıtta yok. */
  payerId?: string;
  /** v2'de string|null — yalnız nakit fark taşıyan satırda dolu. */
  recipientId?: string | null;
  /** Ham nakit fark; borçlu olmayan tarafın satırında 0. */
  amount?: number;
  /** v2: hizmet bedeli (KDV DAHİL; kampanya varsa İNDİRİM SONRASI tutar). */
  tradeFeeAmount?: number;
  /**
   * Hizmet bedeli kampanyasının bu satıra verdiği indirim (İ25).
   *
   * Staging'de ölçüldü (2026-08-26): alan `cashPayments[]` satırının İÇİNDE
   * dönüyor — `TradeResponseDto`'nun okunuşunun aksine takasın kökünde DEĞİL.
   * Örnek gövdede `0`; kampanya uygulanmış bir takas bulunamadı, o yüzden
   * dolu bir örnek üzerinde doğrulanmadı.
   *
   * `tradeFeeAmount` zaten indirilmiş tutar olduğu için bu alan yalnız
   * BİLGİLENDİRME satırıdır — hiçbir toplamdan tekrar düşülmez.
   */
  tradeFeeDiscountAmount?: number;
  /** v2: bu tarafın 2 bacaklık kargo bedeli. */
  shippingAmount?: number;
  /** v1 kalıntısı — v2 satırlarında her zaman 0. */
  commission?: number;
  /** PayTR'nin çektiği tutar. v2'de amount + tradeFeeAmount + shippingAmount. */
  totalAmount?: number;
  status?: string;
  paidAt?: string | null;
}

export interface TradeItem {
  id: string;
  productId?: string;
  side?: "initiator" | "receiver";
  quantity: number;
  valueAtTrade: number;
  // API'nin döndürdüğü düz alanlar (TradeItemResponseDto):
  productTitle?: string;
  productImage?: string;
  productImages?: Array<{ cardUrl?: string; detailUrl?: string }>;
  // Eski/iç içe şekil — savunmacı fallback.
  product?: {
    id?: string;
    title?: string;
    price?: number;
    images?: Array<{ url?: string; cardUrl?: string }> | string[];
  };
}

export interface Trade {
  id: string;
  tradeNumber: string;
  status: string;
  initiatorId: string;
  receiverId: string;
  cashAmount: number | null;
  cashPayerId: string | null;
  initiatorMessage: string | null;
  receiverMessage: string | null;
  responseDeadline: string;
  initiatorShippedAt: string | null;
  receiverShippedAt: string | null;
  initiatorTrackingNumber: string | null;
  receiverTrackingNumber: string | null;
  completedAt: string | null;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  initiatorName: string;
  receiverName: string;
  // API ürünleri iki ayrı dizi olarak döndürür; eski `items` (side'lı) fallback.
  initiatorItems?: TradeItem[];
  receiverItems?: TradeItem[];
  items?: TradeItem[];
  shipments?: TradeShipment[];
  cashPayment?: TradeCashPayment | null;
  /** v2: her zaman var, kabulden önce []. İki satırlı olması v2 işaretidir. */
  cashPayments?: TradeCashPayment[];
  cashCommission?: number | null;
  paymentDeadline?: string | null;
  shippingDeadline?: string | null;
  confirmationDeadline?: string | null;
  version?: number;
  canCancel?: boolean;
  firstWarehouseArrivalAt?: string | null;
}

// #216: the strict react-i18next translator (keys typed against @/i18n/lib).
// Trade components receive it as a prop and call it with catalog keys.
export type TFn = TFunction;
