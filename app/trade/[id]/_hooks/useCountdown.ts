import { useEffect, useState } from 'react';
import { useScreenFocused } from '@/ui';

/**
 * Geri sayım için saniyede bir tetiklenen `now` (ms). Yalnız geçerli ve henüz dolmamış bir son
 * tarih varken VE ekran odaktayken tıklar — son tarih yoksa / dolduysa / üstüne ekran itildiyse
 * interval kurulmaz. Ekranın tepesinde değil, kalan süreyi GÖSTEREN küçük bileşende çağrılır;
 * böylece saniyelik render yalnız o bileşeni etkiler (tüm takas ekranını değil).
 */
export function useCountdown(deadlineIso: string | null | undefined): number {
  const focused = useScreenFocused();
  const [now, setNow] = useState(() => Date.now());
  const end = deadlineIso ? new Date(deadlineIso).getTime() : NaN;
  const active = focused && !isNaN(end) && end > now;
  useEffect(() => {
    if (!active) return undefined;
    // Odağa dönüşte bekletmeden güncel değer (arka planda geçen süre).
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
