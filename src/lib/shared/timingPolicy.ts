/**
 * İSTEMCİ POLİTİKA SÜRELERİ — `GET /timing-rules` yanıtının tek okuma kuralı.
 *
 * Ana repodaki `packages/types/src/timing-policy.ts` + web `lib/timing-policy.ts`
 * aynası. Ekranlar "iade için N gününüz var", "ödeme süresi N saat" gibi
 * metinleri sabit sayıyla değil bu değerlerle basar. Uç yüklenene ya da
 * ulaşılamayana kadar geri düşüş değerleri (kayıt varsayılanları) kullanılır —
 * geri düşüş otoriter DEĞİLDİR, yalnız ekran boş/yanlış sayıyla kalmasın diye.
 *
 * Ayrıştırma kasıtlı bağışıktır: eksik, sayı olmayan ya da 1'den küçük kayıt
 * yalnız KENDİ kimliği için geri düşer; kalan kimlikler sunucu değeriyle kalır.
 */
import {
  PUBLIC_TIMING_RULE_IDS,
  type PublicTimingPolicy,
  type PublicTimingRuleId,
  type TimingUnit,
} from '@/lib/api/timingRules';

/**
 * Kayıt varsayılanları (`TIMING_RULES[id].default` / `.unit`). İade penceresi
 * ve payout grace web'deki `@tarodan/shared` sabitleriyle aynı (14 / 1).
 */
const TIMING_DEFAULTS: Record<PublicTimingRuleId, { value: number; unit: TimingUnit }> = {
  listingTtlDays: { value: 60, unit: 'days' },
  listingExpiryWarningDays: { value: 7, unit: 'days' },
  offerExpiryHours: { value: 24, unit: 'hours' },
  tradeResponseHours: { value: 72, unit: 'hours' },
  tradePaymentHours: { value: 48, unit: 'hours' },
  tradeShippingDays: { value: 7, unit: 'days' },
  tradeConfirmationDays: { value: 3, unit: 'days' },
  tradeHoldDays: { value: 3, unit: 'days' },
  preparingDeadlineDays: { value: 3, unit: 'days' },
  returnWindowDays: { value: 14, unit: 'days' },
  orderPaymentWindowHours: { value: 24, unit: 'hours' },
  payoutGraceDays: { value: 1, unit: 'days' },
  returnDropoffDays: { value: 14, unit: 'days' },
  returnInspectionHours: { value: 24, unit: 'hours' },
};

/** Uç yüklenemediğinde geçerli değerler. */
export const FALLBACK_TIMING_POLICY: PublicTimingPolicy = Object.fromEntries(
  PUBLIC_TIMING_RULE_IDS.map((id) => [id, { ...TIMING_DEFAULTS[id] }]),
) as PublicTimingPolicy;

/** ICU parametreleri: kayıt kimliği = parametre adı (`{returnWindowDays}`). */
export type TimingMessageValues = Record<PublicTimingRuleId, number>;

function readValue(entry: unknown): number | null {
  const raw = (entry as { value?: unknown } | null | undefined)?.value;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : null;
}

/**
 * Uç yanıtını politikaya çevirir; geçersiz/eksik her kimlik `fallback`'ten gelir.
 * Birim her zaman kayıttan okunur (yanıtın birimine güvenilmez).
 */
export function parseTimingPolicy(
  payload: unknown,
  fallback: PublicTimingPolicy = FALLBACK_TIMING_POLICY,
): PublicTimingPolicy {
  const source =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  return Object.fromEntries(
    PUBLIC_TIMING_RULE_IDS.map((id) => [
      id,
      { value: readValue(source[id]) ?? fallback[id].value, unit: TIMING_DEFAULTS[id].unit },
    ]),
  ) as PublicTimingPolicy;
}

/**
 * Yükleyiciyi çalıştırır; hata (ağ, 5xx, bozuk gövde) politikayı geri düşüşe
 * çevirir — ekran süre yüzünden kırılmaz.
 */
export async function loadTimingPolicy(
  load: () => Promise<unknown>,
  fallback: PublicTimingPolicy = FALLBACK_TIMING_POLICY,
): Promise<PublicTimingPolicy> {
  try {
    return parseTimingPolicy(await load(), fallback);
  } catch {
    return fallback;
  }
}

/** Politikadan ICU parametreleri: `t(key, timingMessageValues(policy))`. */
export function timingMessageValues(policy: PublicTimingPolicy): TimingMessageValues {
  return Object.fromEntries(
    PUBLIC_TIMING_RULE_IDS.map((id) => [id, policy[id].value]),
  ) as TimingMessageValues;
}

/** Takvim günü toplama (backend `returnWindowEndsAt` ile aynı aritmetik). */
export function addCalendarDays(from: string | number | Date, days: number): Date | null {
  const date = new Date(from);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date;
}

/** ISO metni tarihe çevirir; boş ya da bozuksa `null`. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
