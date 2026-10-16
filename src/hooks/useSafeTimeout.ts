import { useCallback, useEffect, useRef } from 'react';

/**
 * Bileşen ömrüne bağlı `setTimeout`: dönen `schedule(fn, ms)` ile kurulan zamanlayıcılar
 * bileşen unmount olunca TEMİZLENİR.
 *
 * Neden: "toast göster, 1,5 sn sonra yönlendir" kalıbında kullanıcı bu arada ekrandan çıkarsa
 * (geri, sekme değişimi) çıplak `setTimeout` yine de `router.replace/push` çağırıyor ve kullanıcıyı
 * bulunduğu yerden koparıyordu (ya da unmount olmuş bileşenin state'ine yazıyordu).
 * `schedule` referans-kararlıdır; aynı anda birden çok zamanlayıcı tutabilir. Unmount'tan SONRA
 * çağrılırsa (ör. ekrandan çıkıldıktan sonra biten mutasyonun `onSuccess`'i) hiç kurulmaz.
 */
export function useSafeTimeout() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    if (!mounted.current) return undefined;
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
}
