import { guestApi } from "./client";

/**
 * Herkese açık politika süreleri — `GET /timing-rules` (public, oturum gerekmez).
 *
 * Değerler admin "Süreler ve Kurallar" ekranından yönetilir (iade penceresi,
 * ödeme süresi, hazırlık süresi, satıcı ödeme bekleme payı…). İstemci sabit
 * kopya tutmaz; okuma/geri düşüş kuralı `@/lib/shared/timingPolicy`'de,
 * ekranların tek okuma yolu `useTimingPolicy` / `useTimingValues`.
 *
 * Tipler ana repodaki `packages/types/src/timing-rules.ts`'in istemcinin
 * gördüğü kısmının kopyasıdır (`PUBLIC_TIMING_RULE_IDS` + yanıt şekli).
 */

export type TimingUnit = "minutes" | "hours" | "days";

/** Herkese açık uçtan dönen kayıt kimlikleri — sıra ana repoyla aynı. */
export const PUBLIC_TIMING_RULE_IDS = [
  "listingTtlDays",
  "listingExpiryWarningDays",
  "offerExpiryHours",
  "tradeResponseHours",
  "tradePaymentHours",
  "tradeShippingDays",
  "tradeConfirmationDays",
  "tradeHoldDays",
  "preparingDeadlineDays",
  "returnWindowDays",
  "orderPaymentWindowHours",
  "payoutGraceDays",
  "returnDropoffDays",
  "returnInspectionHours",
] as const;
export type PublicTimingRuleId = (typeof PUBLIC_TIMING_RULE_IDS)[number];

/** `GET /timing-rules` yanıtı: kimlik → { değer, birim }. */
export type PublicTimingPolicy = Record<
  PublicTimingRuleId,
  { value: number; unit: TimingUnit }
>;

export const timingRulesApi = {
  /** Ham gövde döner; ayrıştırma `parseTimingPolicy` ile (bozuk alan geri düşer). */
  getPolicy: () => guestApi.get<unknown>("/timing-rules"),
};
