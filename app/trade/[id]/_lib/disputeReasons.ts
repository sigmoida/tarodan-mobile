/**
 * Takas itirazı nedenleri — TEK kaynak.
 *
 * Değerler API'nin `RaiseTradeDisputeDto` enum'uyla birebir aynıdır
 * (`apps/api/.../trade/dto/update-trade.dto.ts`); başka değer 400 döner. Web
 * `RaiseDisputeModal` ile aynı liste ve aynı etiket anahtarları.
 */
import type { MessageKey } from "@/i18n/lib/generated/keys";

export const DISPUTE_REASONS = [
  "not_as_described",
  "damaged",
  "wrong_item",
  "not_received",
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number];

/** Modal her açıldığında / ilk durumda seçili gelen (geçerli) neden. */
export const DEFAULT_DISPUTE_REASON: DisputeReason = "not_as_described";

/** Neden → i18n anahtarı (web ile aynı anahtarlar). */
export const DISPUTE_REASON_LABEL_KEY: Record<DisputeReason, MessageKey> = {
  not_as_described: "trade.dispute.reasonNotAsDescribed",
  damaged: "trade.dispute.reasonDamaged",
  wrong_item: "trade.dispute.reasonWrongItem",
  not_received: "trade.dispute.reasonNotReceived",
};
