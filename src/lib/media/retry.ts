/**
 * Yeniden denemede hazırlanmış dosya tekrar kullanılabilir mi?
 *
 * Geçici hatalarda (ağ hatası / yanıt yok, 5xx, 408, 429) aynı dosya tekrar denenir — yeniden
 * küçültmek boşa iştir. Diğer 4xx (ör. 400 tür/boyut, 413) DOSYANIN kendisiyle ilgili olabilir:
 * hazırlanmış dosya bırakılır, yeniden deneme orijinalden yeniden hazırlar.
 */
export function canReusePreparedFile(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (typeof status !== 'number') return true;
  if (status >= 500 || status === 408 || status === 429) return true;
  return status < 400;
}
