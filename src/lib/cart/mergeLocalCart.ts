import { cartApi, type ServerCart } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';

/**
 * Hesap düzeyinde KESİN 403'ler: yeniden denemek sonucu değiştirmez (e-posta doğrulanmadı, ban,
 * personel hesabı, IP engeli). Birleştirme durur; satırlar yerelde KALIR (kullanıcı kaybetmez).
 */
const ACCOUNT_BLOCKING_ERROR_CODES = new Set(['EMAIL_NOT_VERIFIED', 'USER_BANNED', 'STAFF_ACCOUNT']);
const ACCOUNT_BLOCKING_I18N_KEYS = new Set(['server.security.accessBlocked']);

/**
 * Sepet hatasının sınıfı:
 * - `rejected`: o satıra dair kalıcı 4xx (satışa uygun değil, askıda satıcı, bulunamadı, stok/adet
 *   kuralı…) → satır yerelden düşer.
 * - `itemForbidden`: o satıra özgü 403 (gövdede satır/ürün bağlamı ya da tanınmayan bir kod) →
 *   satır atlanır (yerelde kalır), kalan satırlarla devam edilir; yeniden denenmez.
 * - `accountBlocked`: hesap düzeyinde kesin 403 → birleştirme durur, satırlar kalır, yeniden
 *   denenmez.
 * - `forbiddenUnknown`: gövdesi tanınmayan 403 → geçici sayılır, sınırlı sayıda yeniden denenir.
 * - `transient`: 401 / 408 / 425 / 429 / 5xx / yanıtsız (ağ) / `SESSION_STALE` → satır korunur,
 *   sonra yeniden denenir.
 */
export type CartErrorKind =
  | 'rejected'
  | 'itemForbidden'
  | 'accountBlocked'
  | 'forbiddenUnknown'
  | 'transient';

type LooseCartError = {
  response?: {
    status?: number;
    data?: { errorCode?: unknown; code?: unknown; i18nKey?: unknown; productId?: unknown };
  };
} | null;

export function classifyCartError(error: unknown): CartErrorKind {
  const response = (error as LooseCartError)?.response;
  const status = response?.status;
  if (typeof status !== 'number' || status < 400 || status >= 500) return 'transient';
  if (status === 403) {
    const data = response?.data;
    if (typeof data?.errorCode === 'string' && ACCOUNT_BLOCKING_ERROR_CODES.has(data.errorCode)) {
      return 'accountBlocked';
    }
    if (typeof data?.i18nKey === 'string' && ACCOUNT_BLOCKING_I18N_KEYS.has(data.i18nKey)) {
      return 'accountBlocked';
    }
    if (typeof data?.code === 'string' || typeof data?.errorCode === 'string' || data?.productId) {
      return 'itemForbidden';
    }
    return 'forbiddenUnknown';
  }
  if ([401, 408, 425, 429].includes(status)) return 'transient';
  return 'rejected';
}

/**
 * Sepet ekleme hatası satırın KESİN reddi mi? (Satır yerelden düşürülür / iyimser yazma geri
 * alınır.) 403'ler hiçbir zaman satırı düşürmez (bkz. `classifyCartError`).
 */
export function isDefinitiveItemRejection(error: unknown): boolean {
  return classifyCartError(error) === 'rejected';
}

/**
 * - `done`: her satır kesin sonuca ulaştı (eklendi, kesin reddedildi → yerelden düştü, ya da satıra
 *   özgü 403 → atlandı).
 * - `blocked`: hesap düzeyinde kesin 403 — birleştirme durur, satırlar yerelde kalır, yeniden yok.
 * - `retry`: geçici hata — kalan satırlar KORUNUR, sonra yeniden.
 * - `retryForbidden`: tanınmayan 403 — `retry` gibi ama çağıran SINIRLI sayıda yeniden dener.
 * - `aborted`: bu arada oturum değişti (`isCurrent` false) — hiçbir şey yapılmaz.
 */
export type CartMergeOutcome = 'done' | 'blocked' | 'retry' | 'retryForbidden' | 'aborted';

function outcomeOf(kind: CartErrorKind): CartMergeOutcome {
  if (kind === 'accountBlocked') return 'blocked';
  if (kind === 'forbiddenUnknown') return 'retryForbidden';
  return 'retry';
}

/**
 * Yerel sepet satırlarından sunucu sepetinde BULUNMAYANLARI gönderir (misafir→üye birleştirmesi).
 * Mevcut sunucu satırının adedi değiştirilmez (başka cihazdaki sepet ezilmez); tekrar çalışmak
 * güvenlidir (her seferinde sunucu sepeti yeniden okunur → kopya satır yok). Uyarı gösterilmez:
 * kullanıcının tetiklemediği arka plan uzlaştırması.
 */
export async function mergeLocalCart(isCurrent: () => boolean): Promise<CartMergeOutcome> {
  if (useCartStore.getState().items.length === 0) return 'done';
  let server: ServerCart | null;
  try {
    const res = await cartApi.get();
    server = ((res.data as any)?.data ?? res.data ?? null) as ServerCart | null;
  } catch (error) {
    if (!isCurrent()) return 'aborted';
    captureException(error, { level: 'warning', tags: { flow: 'cart.mergeOnLogin' } });
    const kind = classifyCartError(error);
    // Sepet okumasında "satıra özgü" yoktur: tanınan kod hesap düzeyi değilse yine sınırlı dene.
    return kind === 'itemForbidden' ? 'retryForbidden' : outcomeOf(kind);
  }
  if (!isCurrent()) return 'aborted';
  const existing = new Set((server?.calculation?.items ?? []).map((it) => it.productId));
  // Satırlar ŞİMDİ okunur: istek beklenirken eklenen/silinen satırlar hesaba katılır.
  const missing = useCartStore.getState().items.filter((it) => !existing.has(it.productId));
  for (const item of missing) {
    if (!isCurrent()) return 'aborted';
    try {
      await cartApi.addItem(item.productId, item.quantity);
    } catch (error) {
      if (!isCurrent()) return 'aborted';
      const kind = classifyCartError(error);
      if (kind === 'rejected') {
        // Sunucu bu satırı REDDETTİ: yerelde HAYALET kalırsa checkout'ta patlar → düşür.
        useCartStore.getState().removeByProductId(item.productId);
        continue;
      }
      // Satıra özgü 403: satır yerelde kalır, diğer satırlarla devam (bu satır yeniden denenmez).
      if (kind === 'itemForbidden') continue;
      captureException(error, { level: 'warning', tags: { flow: 'cart.mergeOnLogin' } });
      return outcomeOf(kind);
    }
  }
  return 'done';
}
