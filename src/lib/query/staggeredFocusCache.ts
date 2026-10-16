import { QueryCache, focusManager, notifyManager, type Query } from '@tanstack/react-query';

/** Ön plana dönüşte HEMEN (ilk partide) yeniden çekilen sorgu sayısı — görünen ekran gecikmesin. */
export const FOCUS_REFETCH_FIRST_BATCH = 8;
/** Sonraki partilerin boyu. */
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
 * - Çekecek olanlar SON ETKİNLİĞE göre sıralanır (verisi en son güncellenen ya da en son gözlemci
 *   kazanan önce — kullanıcının en son baktığı ekranın sorguları). Oluşturulma sırası KULLANILMAZ:
 *   açılışta oluşan sekme kökü sorguları (Ana Sayfa, Favoriler) aksi halde hep sona kalırdı.
 * - İlk `FOCUS_REFETCH_FIRST_BATCH` sorgu HEMEN gider (görünen ekran eskisinden geç tazelenmez),
 *   kalanlar `FOCUS_REFETCH_BATCH`'lik partilerle `FOCUS_REFETCH_STAGGER_MS` arayla. Her parti
 *   anında koşul yeniden denetlenir (`query.onFocus`); bu arada uygulama yine arka plana geçtiyse
 *   kalan partiler iptal edilir.
 */
export class StaggeredFocusQueryCache extends QueryCache {
  private focusTimer: ReturnType<typeof setTimeout> | null = null;
  /** Sorgunun en son gözlemci kazandığı an (ekran mount / yeniden abonelik). */
  private observedAt = new WeakMap<Query, number>();

  constructor(...args: ConstructorParameters<typeof QueryCache>) {
    super(...args);
    this.subscribe((event) => {
      if (event.type === 'observerAdded') this.observedAt.set(event.query, Date.now());
    });
  }

  private lastActivity(q: Query): number {
    return Math.max(q.state.dataUpdatedAt, q.state.errorUpdatedAt, this.observedAt.get(q) ?? 0);
  }

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
    pending.sort((a, b) => this.lastActivity(b) - this.lastActivity(a));

    const runBatch = (size: number) => {
      this.focusTimer = null;
      if (!focusManager.isFocused()) return;
      const batch = pending.splice(0, size);
      notifyManager.batch(() => batch.forEach((q) => q.onFocus()));
      if (pending.length) {
        this.focusTimer = setTimeout(() => runBatch(FOCUS_REFETCH_BATCH), FOCUS_REFETCH_STAGGER_MS);
      }
    };
    runBatch(FOCUS_REFETCH_FIRST_BATCH);
  }
}
