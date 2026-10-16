import { useEffect, useRef, useState } from 'react';
import { theme } from '../lib/theme';

export interface DelayedLoadingOptions {
  /** Bu süreden (ms) kısa süren yüklemede gösterge HİÇ çıkmaz. Varsayılan `theme.loading.delayMs` (150). */
  delay?: number;
  /** Gösterge çıktıysa en az bu süre (ms) kalır. Varsayılan `theme.loading.minVisibleMs` (300). */
  minDuration?: number;
}

/**
 * Yükleme göstergesini (iskelet/spinner) GÖSTERMELİ Mİ? — algılanan hız için:
 *   - `isLoading` `delay`'den kısa sürerse gösterge hiç çıkmaz (önbellekten/çok hızlı gelen veride
 *     iskelet bir kare görünüp kaybolmaz; "göz kırpma" yok),
 *   - çıktıysa en az `minDuration` kalır (iskelet → içerik → titreme yok), sonra kapanır.
 * `delay: 0` → `isLoading` true olduğu ilk render'da gösterilir.
 *
 * Çağıran, yükleniyor ama henüz göstermiyorken (gecikme penceresi) içeriği DEĞİL boş gövdeyi çizer;
 * `PageShell` bunu kendisi yapar. Liste ekranlarında `ListEmptyComponent` için:
 *   `const showSkeleton = useDelayedLoading(isLoading);`
 *   `ListEmptyComponent={isLoading || showSkeleton ? (showSkeleton ? <Skeleton… /> : null) : <EmptyState… />}`
 */
export function useDelayedLoading(isLoading: boolean, options: DelayedLoadingOptions = {}): boolean {
  const delay = options.delay ?? theme.loading.delayMs;
  const minDuration = options.minDuration ?? theme.loading.minVisibleMs;
  const [shown, setShown] = useState(() => isLoading && delay <= 0);
  const shownAt = useRef<number | null>(shown ? Date.now() : null);

  // `delay: 0`: yükleme başladığı render'da göster (efekt beklenmez — boş kare yok).
  if (isLoading && delay <= 0 && !shown) {
    shownAt.current = Date.now();
    setShown(true);
  }

  useEffect(() => {
    if (isLoading) {
      if (shown) return undefined;
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, delay);
      return () => clearTimeout(timer);
    }
    if (!shown) return undefined;
    const left = minDuration - (Date.now() - (shownAt.current ?? 0));
    if (left <= 0) {
      shownAt.current = null;
      setShown(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      shownAt.current = null;
      setShown(false);
    }, left);
    return () => clearTimeout(timer);
  }, [isLoading, shown, delay, minDuration]);

  return shown;
}
