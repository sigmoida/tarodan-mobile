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
import i18n from '@/i18n/config';
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
 *
 * İstek HATASI burada yutulmaz: sorgu hata durumunda kalır ve önbelleğe geri
 * düşüş yazılmaz (bkz. `useTimingPolicy`); geri düşüş yalnız gösterimde kullanılır.
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

/** Politikadan ICU parametreleri: `t(key, timingMessageValues(policy))`. */
export function timingMessageValues(policy: PublicTimingPolicy): TimingMessageValues {
  return Object.fromEntries(
    PUBLIC_TIMING_RULE_IDS.map((id) => [id, policy[id].value]),
  ) as TimingMessageValues;
}

/**
 * Sunucunun iş takvimi saat dilimi (API `common/helpers/tr-calendar.ts` →
 * `TR_TIME_ZONE`). Süre tarihleri (iade penceresi sonu, ödeme tarihi, kargoya
 * verme son tarihi) bu dilimde biçimlenir — cihaz başka dilimdeyse de kullanıcı
 * sunucunun uyguladığı saati görür.
 */
export const SERVER_TIME_ZONE = 'Europe/Istanbul';

const DAY_MS = 86_400_000;

/**
 * Takvim günü toplama — sunucu `returnWindowEndsAt` / `escrowReleaseAt` ile
 * AYNI sonuç. Sunucu `setDate(getDate() + n)` ile `TZ` tanımsız (UTC) süreçte
 * hesaplar; Türkiye de 2016'dan beri sabit UTC+03 (yaz saati yok). İki dilimde
 * de takvim günü tam 24 saattir, bu yüzden hesap milisaniye üzerinden yapılır.
 * Cihazın yerel `setDate`'i KULLANILMAZ: yaz saatli bir dilimde (ör. Avrupa)
 * geçiş gününü aşan pencere bir saat kayardı.
 */
export function addCalendarDays(from: string | number | Date, days: number): Date | null {
  const date = new Date(from);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + days * DAY_MS);
}

/** Tarih biçimi için aktif dilin `Intl` etiketi (çağrı anında okunur). */
export function activeDateLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'tr-TR';
}

/**
 * Süre tarihlerinin gösterimi — sunucu saat diliminde (`SERVER_TIME_ZONE`) ve
 * uygulamanın dilinde: "13 Ekim 2026 14:30" / "October 13, 2026 at 02:30 PM".
 */
export function formatPolicyDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(activeDateLocale(), {
    timeZone: SERVER_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO metni tarihe çevirir; boş ya da bozuksa `null`. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
