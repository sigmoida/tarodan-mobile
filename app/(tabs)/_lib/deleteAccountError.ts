/**
 * `DELETE /users/me` reddi (400 `server.user.deleteAccountBlocked`) →
 * kullanıcıya gösterilecek metin + yol. Sunucu engelleri hem yerelleştirilmiş
 * `errors[]` (her engel bir cümle) hem sayısal `details` olarak döndürür
 * (`user-profile.service` `deleteAccount`). Web aynı listeyi toast'larla
 * gösteriyor (yol düğmesi yok); mobil önceden yalnız başlığı ("aşağıdaki
 * işlemleri tamamlayın:") gösteriyor, listeyi yutuyordu.
 *
 * B-2.6 yolları — sunucunun ilan engeli (`details.activeProducts`) aktif,
 * onay bekleyen ve REZERVE ilanları birlikte sayar, hangisi olduğunu söylemez.
 * Ayrım `GET /products/my/stats` sayaçlarıyla yapılır (`deleteAccountPaths`):
 * - aktif / onay bekleyen ilan İlanlarım'dan kapatılabilir ya da silinebilir
 *   → "İlanlarımı yönet";
 * - rezerve ilan bir satışa bağlıdır, İlanlarım'dan kapatılamaz ve silinemez
 *   (sunucu `product-update.service` remove: sold/reserved reddedilir) →
 *   durum açıklanır, "Satışlarım" yolu verilir;
 * - bekleyen sipariş engelinde (rezerve yoksa) "Siparişlerim".
 * İade, ödeme, blokaj engelleri beklenmesi gereken süreçlerdir; yalnız metin.
 */
import { errorText } from '@/lib/api';

export interface DeleteAccountFailure {
  message: string;
  /** Sunucu engel listesi döndü (silme kuralı; ağ/sunucu hatası değil). */
  blocked: boolean;
  /** Sunucunun ilan engeli: aktif + onay bekleyen + rezerve toplamı. */
  blockingListings: number;
  /** Bekleyen sipariş engeli (alıcı ya da satıcı tarafı). */
  pendingOrders: number;
}

interface DeleteBlockedBody {
  errors?: unknown;
  details?: { activeProducts?: unknown; pendingOrders?: unknown };
}

const count = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

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

  const lines = [head, ...reasons.map((r) => `• ${r}`)];
  const blocked = reasons.length > 0;
  return {
    message: lines.join('\n'),
    blocked,
    blockingListings: blocked ? count(data?.details?.activeProducts) : 0,
    pendingOrders: blocked ? count(data?.details?.pendingOrders) : 0,
  };
}

/** `GET /products/my/stats` → `counts` (yalnız silmeyi engelleyen durumlar). */
export interface ListingStatusCounts {
  active: number;
  pending: number;
  reserved: number;
}

export interface DeleteAccountPaths {
  /** Kapatılabilir (aktif / onay bekleyen) ilan var → "İlanlarımı yönet". */
  manageListings: boolean;
  /** Satışa bağlı rezerve ilan sayısı (açıklama metni için). */
  reservedListings: number;
  /** Rezerve ilan var → "Satışlarım". */
  sales: boolean;
  /** Bekleyen sipariş var, rezerve yok → "Siparişlerim". */
  orders: boolean;
}

/**
 * Hangi yollar gösterilir? Android uyarısı en fazla 3 düğme taşır: "Kapat"
 * + en çok iki yol (ilanlar + satış/sipariş). `counts` alınamadıysa (`null`)
 * ya da engelle çelişiyorsa ilanların durumu bilinemez: ilan engeli varken
 * İlanlarım yolu yine verilir (yalnız navigasyon; orada her ilanın durumu
 * görünür).
 */
export function deleteAccountPaths(
  failure: Pick<DeleteAccountFailure, 'blockingListings' | 'pendingOrders'>,
  counts: ListingStatusCounts | null,
): DeleteAccountPaths {
  const { blockingListings, pendingOrders } = failure;
  // Sayaçlar engelle çelişiyorsa (hepsi 0) bilinmiyor say.
  const known =
    counts && count(counts.active) + count(counts.pending) + count(counts.reserved) > 0
      ? counts
      : null;
  const reservedListings =
    blockingListings > 0 && known ? Math.min(count(known.reserved), blockingListings) : 0;
  const manageListings =
    blockingListings > 0 && (known ? count(known.active) + count(known.pending) > 0 : true);
  const sales = reservedListings > 0;
  return {
    manageListings,
    reservedListings,
    sales,
    orders: !sales && pendingOrders > 0,
  };
}
