import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** `setTimeout` üst sınırı (~24,8 gün); daha uzak tarihte ara turla yeniden kurulur. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Bir son tarihe göre türetilen görünüm (ör. kargoya verme son tarihi notu)
 * ekran açıkken tarih geçince güncellensin diye "şimdi" değeri.
 *
 * Basit tetikleyici: son tarih anında bir kez yeniden çizim; ayrıca uygulama
 * ön plana döndüğünde (`AppState` → `active`) yeniden hesap — arka planda
 * zamanlayıcılar donabildiği için. Son tarih yoksa ya da geçmişse zamanlayıcı
 * kurulmaz.
 */
export function useDeadlineNow(deadline: string | null | undefined): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline).getTime();
    if (Number.isNaN(target)) return;
    const delay = target - now.getTime();
    if (delay < 0) return;
    // +1 sn: tarih "geçti" sayılsın (`deadline <= now`).
    const timer = setTimeout(() => setNow(new Date()), Math.min(delay + 1000, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [deadline, now]);

  return now;
}
