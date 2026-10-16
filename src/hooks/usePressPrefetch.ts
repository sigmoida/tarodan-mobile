import { useCallback, useEffect, useRef } from 'react';

/** Basılı tutma bu süreyi kaydırma olmadan aşarsa önceden çekilir (ms). */
export const PRESS_PREFETCH_DELAY_MS = 100;

/**
 * Kart dokunuşunda önceden çekme — kaydırırken TETİKLENMEZ (mobil veri).
 *
 * Eski davranış `onPressIn`'de hemen çekiyordu: listeyi kaydırmak için parmağı bir karta koymak
 * bile istek atıyordu. Şimdi:
 * - `onPressIn` → `PRESS_PREFETCH_DELAY_MS` sonra çekmeyi zamanla;
 * - `onPressOut` → bekleyen zamanlamayı iptal et (kaydırma başlayınca Pressable yanıtlayıcıyı
 *   bırakır → `onPressOut` gelir, `onPress` GELMEZ);
 * - `onPress` (gerçek dokunuş) → hemen çek. Basılı tutmada zaten çekildiyse `prefetchQuery`
 *   uçuştaki / taze veriyi yeniden kullanır; gezinen ekranın sorgusu da aynı isteğe bağlanır.
 *
 * `prefetch` undefined ise (önceden çekme kapalı) hiçbir şey yapmaz; dönen işleyiciler de undefined.
 */
export function usePressPrefetch(prefetch: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchRef = useRef(prefetch);
  prefetchRef.current = prefetch;

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const fire = useCallback(() => {
    cancel();
    prefetchRef.current?.();
  }, [cancel]);

  const onPressIn = useCallback(() => {
    cancel();
    timer.current = setTimeout(fire, PRESS_PREFETCH_DELAY_MS);
  }, [cancel, fire]);

  useEffect(() => cancel, [cancel]);

  const enabled = !!prefetch;
  return {
    onPressIn: enabled ? onPressIn : undefined,
    onPressOut: enabled ? cancel : undefined,
    /** `onPress` işleyicisinin başında çağrılır. */
    prefetchNow: fire,
  };
}
