/**
 * One `GET /payments/me` row as this screen reads it (tarodan-app
 * `payment-query.service.ts` `getUserPayments`). `provider` is sent too but never shown.
 */
export interface PaymentHistoryApiItem {
  id: string;
  amount: number | string;
  status: string;
  /** Not sent by the API today; shown when it is. */
  method?: string | null;
  description?: string | null;
  orderNumber?: string | null;
  product?: { title?: string | null; images?: (string | null)[] | null } | null;
  createdAt: string;
}

/** Older and newer list envelopes the screen accepts. */
export type PaymentHistoryResponse =
  | { payments?: PaymentHistoryApiItem[]; data?: PaymentHistoryApiItem[] }
  | PaymentHistoryApiItem[]
  | null
  | undefined;

/** Screen model of one payment history row. */
export interface Payment {
  id: string;
  amount: number;
  status: string;
  /** Payment method label from the API; the row falls back to a generic "Card". */
  method?: string;
  description: string;
  createdAt: string;
  imageUrl?: string;
}
