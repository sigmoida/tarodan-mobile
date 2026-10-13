/**
 * `DELETE /users/me` reddi (400 `server.user.deleteAccountBlocked`) →
 * kullanıcıya gösterilecek metin + yol. Sunucu engelleri hem yerelleştirilmiş
 * `errors[]` (her engel bir cümle) hem sayısal `details` olarak döndürür
 * (`user-profile.service` `deleteAccount`). Web aynı listeyi toast'larla
 * gösteriyor; mobil önceden yalnız başlığı ("aşağıdaki işlemleri
 * tamamlayın:") gösteriyor, listeyi yutuyordu.
 *
 * B-2.6: aktif ilan engeli varsa (en sık engel; satıcı çoğu zaman ilanını
 * kapatmadan silmeye çalışıyor) "İlanlarımı yönet" ile ilanlarım ekranına
 * yol gösterilir. Diğer engeller (sipariş, iade, ödeme) kullanıcının
 * beklemesi gereken süreçlerdir; yalnız metin gösterilir.
 */
import { errorText } from '@/lib/api';

export interface DeleteAccountFailure {
  message: string;
  /** Sunucu engel listesi döndü (silme kuralı; ağ/sunucu hatası değil). */
  blocked: boolean;
  /** Aktif ilan engeli var → "İlanlarımı yönet" düğmesi. */
  hasActiveListings: boolean;
}

interface DeleteBlockedBody {
  errors?: unknown;
  details?: { activeProducts?: unknown };
}

export function describeDeleteAccountError(
  error: unknown,
  fallback: string,
): DeleteAccountFailure {
  const data = (error as { response?: { data?: DeleteBlockedBody } })?.response?.data;
  // Başlık: ortak `errorText` (dizi mesaj, boş mesaj → fallback).
  const head = errorText(error, fallback);
  const reasons = Array.isArray(data?.errors)
    ? data.errors.filter((e): e is string => typeof e === 'string' && e.length > 0)
    : [];
  const activeProducts = Number(data?.details?.activeProducts ?? 0);

  const lines = [head, ...reasons.map((r) => `• ${r}`)];
  return {
    message: lines.join('\n'),
    blocked: reasons.length > 0,
    hasActiveListings: Number.isFinite(activeProducts) && activeProducts > 0,
  };
}
