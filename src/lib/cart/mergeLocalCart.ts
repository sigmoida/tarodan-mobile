import { cartApi, type ServerCart } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { captureException } from '@/services/sentry';

/**
 * Sepet ekleme hatası satırın KESİN reddi mi? (Satır yerelden düşürülür.)
 *
 * Yalnız o satıra dair kalıcı 4xx (satışa uygun değil, askıda satıcı, bulunamadı, stok/adet
 * kuralı…). Şunlar kesin DEĞİLDİR — satır korunur, sonra yeniden denenir:
 * - 401 / 403: oturum ya da yetki (ban, bayat token, refresh'in geçici hatası) — satırla ilgisiz;
 * - 408 / 425 / 429: zaman aşımı / hız sınırı;
 * - 5xx, yanıtsız (ağ), `SESSION_STALE` (oturum değişti — yanıtı yok).
 */
export function isDefinitiveItemRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (typeof status !== 'number' || status < 400 || status >= 500) return false;
  return ![401, 403, 408, 425, 429].includes(status);
}

export type CartMergeOutcome = 'done' | 'retry' | 'aborted';

/**
 * Yerel sepet satırlarından sunucu sepetinde BULUNMAYANLARI gönderir (misafir→üye birleştirmesi).
 *
 * - Mevcut sunucu satırının adedi değiştirilmez (başka cihazdaki sepet ezilmez); tekrar çalışmak
 *   güvenlidir (her seferinde sunucu sepeti yeniden okunur → kopya satır yok).
 * - `done`: her satır kesin sonuca ulaştı (eklendi ya da kesin reddedildi → yerelden düştü).
 * - `retry`: geçici hata (ağ / 5xx / 401 / 403 / 429…) — kalan satırlar KORUNUR, sonra yeniden.
 * - `aborted`: bu arada oturum değişti (`isCurrent` false) — hiçbir şey yapılmaz.
 * Uyarı gösterilmez: kullanıcının tetiklemediği arka plan uzlaştırması.
 */
export async function mergeLocalCart(isCurrent: () => boolean): Promise<CartMergeOutcome> {
  if (useCartStore.getState().items.length === 0) return 'done';
  let server: ServerCart | null;
  try {
    const res = await cartApi.get();
    server = ((res.data as any)?.data ?? res.data ?? null) as ServerCart | null;
  } catch (error) {
    captureException(error, { level: 'warning', tags: { flow: 'cart.mergeOnLogin' } });
    return isCurrent() ? 'retry' : 'aborted';
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
      if (isDefinitiveItemRejection(error)) {
        // Sunucu bu satırı REDDETTİ: yerelde HAYALET kalırsa checkout'ta patlar → düşür.
        useCartStore.getState().removeByProductId(item.productId);
        continue;
      }
      captureException(error, { level: 'warning', tags: { flow: 'cart.mergeOnLogin' } });
      return 'retry';
    }
  }
  return 'done';
}
