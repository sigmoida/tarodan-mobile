import { useEffect, useState } from 'react';

/**
 * `deadline`'a (ms, `Date.now()` ölçeğinde) kalan saniye; yalnız `active` ve süre dolmamışken
 * saniyede bir tıklar. Saniyelik render yalnız ÇAĞIRAN bileşeni etkiler — geri sayımı gösteren
 * küçük yaprakta (yeniden gönder düğmesi) çağrılır, akış hook'unda değil (OTP modalı, e-posta /
 * telefon doğrulama).
 */
export function useSecondsUntil(deadline: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  // Yeni süre başladı (`deadline` değişti): ilk karede bayat `now` ile şişkin süre görünmesin.
  const [seenDeadline, setSeenDeadline] = useState(deadline);
  if (seenDeadline !== deadline) {
    setSeenDeadline(deadline);
    setNow(Date.now());
  }
  const ticking = active && deadline > now;
  useEffect(() => {
    if (!ticking) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking, deadline]);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
