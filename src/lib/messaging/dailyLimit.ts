/**
 * Günlük mesaj limiti — `GET /messages/daily-limit` yanıtının saf yardımcıları.
 *
 * Sunucu tek kaynaktır: limit platform ayarıdır (`daily_message_limit`), bugün
 * (UTC) gönderilen mesaj sayısı sunucuda sayılır. İstemci katman tablosundan
 * limit TÜRETMEZ ve kendi sayacını tutmaz.
 */
export interface DailyLimit {
  remaining: number;
  limit: number;
}

/** Bu kadar ya da daha az hak kalınca uyarı bandı çıkar. */
export const DAILY_LIMIT_WARN_THRESHOLD = 10;

/** Bozuk/eksik gövdede `null` (limit bilinmiyor → istemci engellemez, sunucu uygular). */
export function parseDailyLimit(raw: unknown): DailyLimit | null {
  const body = (raw as { data?: unknown } | null)?.data ?? raw;
  const r = (body as { remaining?: unknown; limit?: unknown } | null) ?? {};
  if (typeof r.remaining !== 'number' || typeof r.limit !== 'number') return null;
  if (!Number.isFinite(r.remaining) || !Number.isFinite(r.limit)) return null;
  return { remaining: Math.max(0, r.remaining), limit: r.limit };
}

export interface DailyLimitView {
  limit: number | undefined;
  remaining: number | undefined;
  /** Bugün gönderilen. */
  used: number | undefined;
  /** Hak bitmedi (ya da bilinmiyor). */
  canSend: boolean;
  /** Hak az kaldı ya da bitti (uyarı bandı için). */
  nearLimit: boolean;
}

const sameUtcDay = (a: number, b: number) =>
  new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

/**
 * `dataUpdatedAt` verilirse DÜNDEN (önceki UTC günü) kalan kayıt "bilinmiyor" sayılır:
 * sunucu 00:00 UTC'de sayacı sıfırlar; ekran gece yarısını aşıp açık kalırsa bayat
 * "hak bitti" kaydı (`remaining: 0`) kullanıcıyı kilitli tutmasın. `canSend` böylece
 * `isCachedLimitExhausted` ile AYNI kurala uyar (gönderimden önceki önbellek denetimi).
 */
export function viewDailyLimit(
  data: DailyLimit | null | undefined,
  dataUpdatedAt?: number,
  now: number = Date.now(),
): DailyLimitView {
  const staleDay = !!data && !!dataUpdatedAt && !sameUtcDay(dataUpdatedAt, now);
  if (!data || staleDay) {
    return { limit: undefined, remaining: undefined, used: undefined, canSend: true, nearLimit: false };
  }
  return {
    limit: data.limit,
    remaining: data.remaining,
    used: Math.max(0, data.limit - data.remaining),
    canSend: data.remaining > 0,
    nearLimit: data.remaining <= DAILY_LIMIT_WARN_THRESHOLD,
  };
}

/**
 * Gönderimden ÖNCE önbelleğe bakıp isteği boşa atmamak için: yalnız BUGÜN
 * (UTC) alınmış "hak bitti" kaydı engeller. Dünden kalan kayıt engellemez —
 * sunucu 00:00 UTC'de sayacı sıfırlar, bayat cache kullanıcıyı kilitlemesin.
 */
export function isCachedLimitExhausted(
  data: DailyLimit | null | undefined,
  dataUpdatedAt: number | undefined,
  now: number = Date.now(),
): boolean {
  if (!data || data.remaining > 0 || !dataUpdatedAt) return false;
  return sameUtcDay(dataUpdatedAt, now);
}
