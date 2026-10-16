/**
 * 4xx yeniden denenmez — TEK KAYNAK (CLAUDE.md §5). Artık sorguların VARSAYILAN
 * `retry`'si (bkz. `client.ts`).
 *
 * Eski varsayılan `retry: 2` bir kupon 400'ünde aynı isteği üç kez atıp aynı
 * uyarıyı üç kez bastırıyordu; istemci hatası tekrar denemekle düzelmiyor.
 * Ağ/5xx hataları en fazla 2 kez denenir.
 *
 * Sepet ve checkout AYNI quote anahtarını paylaşır; yüklem iki yerde
 * kopyalanırsa biri güncellenip diğeri unutulduğunda aynı sorgu iki ekranda
 * farklı davranır. Bu yüzden buradan import edilir.
 *
 * NOT (bilerek kapsam dışı): 408 (timeout) ve 429 (rate limit) de 4xx olduğu için
 * yeniden denenmiyor. Her iki ekranda da kullanıcıya "Tekrar Dene" çıkış yolu
 * verildiği için kilitlenme yok.
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) return false;
  return failureCount < 2;
}
