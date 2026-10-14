/**
 * `DELETE /users/me` reddi (400 `server.user.deleteAccountBlocked`) → ekranda
 * gösterilecek başlık + engel listesi + yollar. Sözleşme sunucuda
 * (`user-profile.service` `deleteAccount` / `assertNoDeletionBlockers`):
 * yerelleştirilmiş `errors[]` (her engel bir cümle) + sayısal `details`.
 * Web aynı başlık + her engeli toast'la gösteriyor; mobil ekranda kalıcı listeler.
 *
 * Engeller ve yolları:
 * - İlan engeli (`details.activeProducts` — ad sözleşme gereği korunur): yeni sunucuda
 *   YALNIZ süren satışa/takasa bağlı REZERVE ilanları sayar (aktif / onay bekleyen ilanlar
 *   silmede pasife alınır); hâlâ yayında olan sunucu sürümü aktif + onay bekleyen +
 *   rezerve toplamını sayar. Hangisi olduğu bilinmediği için iki yol birlikte verilir:
 *   "İlanlarımı yönet" (aktif/onay bekleyen ilan kapatılabilir) ve "Satışlarım"
 *   (rezerve ilan satış bitince serbest kalır). Sunucu cümlesi durumu ayrıca anlatır.
 * - Bekleyen sipariş (alıcı ya da satıcı tarafı) → "Siparişlerim".
 * - Süren takas → "Takaslarım".
 * - Açık iade, bekleyen satıcı ödemesi, ödeme blokajı beklenmesi gereken süreçlerdir;
 *   yalnız metin (sunucu cümlesi).
 */
import { errorText } from '@/lib/api';

export interface DeleteAccountFailure {
  /** Sunucu başlığı ("…aşağıdaki işlemleri tamamlamanız gerekmektedir:") ya da fallback. */
  title: string;
  /** Sunucunun yerelleştirilmiş engel cümleleri. */
  reasons: string[];
  /** Sunucu engel listesi döndü (silme kuralı; ağ/sunucu hatası değil). */
  blocked: boolean;
  /** Sunucunun ilan engeli (`details.activeProducts`; sürüme göre yalnız rezerve ya da hepsi). */
  blockingListings: number;
  /** Bekleyen sipariş (alıcı ya da satıcı tarafı). */
  pendingOrders: number;
  /** Süren takas. */
  activeTrades: number;
}

interface DeleteBlockedBody {
  errors?: unknown;
  details?: { activeProducts?: unknown; pendingOrders?: unknown; activeTrades?: unknown };
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
  const title = errorText(error, fallback);
  const reasons = Array.isArray(data?.errors)
    ? data.errors.filter((e): e is string => typeof e === 'string' && e.length > 0)
    : [];
  const blocked = reasons.length > 0;
  return {
    title,
    reasons,
    blocked,
    blockingListings: blocked ? count(data?.details?.activeProducts) : 0,
    pendingOrders: blocked ? count(data?.details?.pendingOrders) : 0,
    activeTrades: blocked ? count(data?.details?.activeTrades) : 0,
  };
}

export type DeleteAccountPathKey = 'listings' | 'sales' | 'orders' | 'trades';

export interface DeleteAccountPath {
  key: DeleteAccountPathKey;
  href: '/settings/my-listings' | '/sales' | '/orders' | '/trades';
}

/** Engelin izlenebileceği ekranlar (yalnız navigasyon), sunucu sırasıyla. */
export function deleteAccountPaths(
  failure: Pick<DeleteAccountFailure, 'blockingListings' | 'pendingOrders' | 'activeTrades'>,
): DeleteAccountPath[] {
  const paths: DeleteAccountPath[] = [];
  if (failure.blockingListings > 0) {
    paths.push({ key: 'listings', href: '/settings/my-listings' });
    paths.push({ key: 'sales', href: '/sales' });
  }
  if (failure.activeTrades > 0) paths.push({ key: 'trades', href: '/trades' });
  if (failure.pendingOrders > 0) paths.push({ key: 'orders', href: '/orders' });
  return paths;
}
