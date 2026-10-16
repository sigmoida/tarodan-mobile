import { QueryCache, focusManager, notifyManager, type Query } from '@tanstack/react-query';

/** Ön plana dönüşte aynı anda yeniden çekilen en fazla sorgu sayısı. */
export const FOCUS_REFETCH_BATCH = 4;
/** Ardışık partiler arası bekleme (ms). */
export const FOCUS_REFETCH_STAGGER_MS = 300;

const wouldRefetchOnFocus = (q: Query) => q.observers.some((o) => o.shouldFetchOnWindowFocus());

/**
 * Ön plana dönüşte (focusManager → `onFocus`) eskimiş sorguları TEK SEFERDE değil, partiler halinde
 * yeniden çeken QueryCache.
 *
 * Varsayılan `QueryCache.onFocus` her sorgunun `onFocus`'unu aynı tick'te çağırır: yığında/sekmelerde
 * monte kalan ekranların 10–20 eskimiş sorgusu bir anda ağa çıkıyordu. Burada:
 * - Yeniden çekmeyecek sorgular (gözlemcisiz, taze, `refetchOnWindowFocus: false`) hemen işlenir
 *   (yalnız duraklamış yeniden denemeleri sürdürür, istek atmaz).
 * - Çekecek olanlar EN YENİ oluşturulandan başlayarak (odaktaki ekranın sorguları genelde en son
 *   oluşturulandır) `FOCUS_REFETCH_BATCH`'lik partilerle, aralarında `FOCUS_REFETCH_STAGGER_MS`
 *   beklenerek çekilir. Her parti anında koşul yeniden denetlenir (`query.onFocus` kendi kontrolünü
 *   yapar); bu arada uygulama yine arka plana geçtiyse kalan partiler iptal edilir.
 */
export class StaggeredFocusQueryCache extends QueryCache {
  private focusTimer: ReturnType<typeof setTimeout> | null = null;

  override onFocus(): void {
    if (this.focusTimer) clearTimeout(this.focusTimer);
    this.focusTimer = null;

    const pending: Query[] = [];
    notifyManager.batch(() => {
      for (const q of this.getAll()) {
        if (wouldRefetchOnFocus(q)) pending.push(q);
        else q.onFocus();
      }
    });
    pending.reverse();

    const runBatch = () => {
      this.focusTimer = null;
      if (!focusManager.isFocused()) return;
      const batch = pending.splice(0, FOCUS_REFETCH_BATCH);
      notifyManager.batch(() => batch.forEach((q) => q.onFocus()));
      if (pending.length) this.focusTimer = setTimeout(runBatch, FOCUS_REFETCH_STAGGER_MS);
    };
    runBatch();
  }
}
