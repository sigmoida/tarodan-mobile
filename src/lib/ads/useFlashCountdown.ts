import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { remaining } from './countdown';

/**
 * Flaş kampanya geri sayımı ("12:34:56" / "3g 04:12"). `endsAt` yoksa ya da süre
 * dolduysa `null`. Süre dolunca zamanlayıcı DURDURULUR (boşuna 1 sn'de bir
 * render etmesin); çağıran `null` görünce çipi hiç çizmez.
 */
export function useFlashCountdown(endsAt: string | null | undefined): string | null {
  const { t } = useTranslation();
  const dayUnit = t('time.dayShort');
  const [left, setLeft] = useState<string | null>(() =>
    endsAt ? remaining(endsAt, Date.now(), dayUnit) : null,
  );

  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const next = remaining(endsAt, Date.now(), dayUnit);
      setLeft(next);
      if (next === null) clearInterval(timer);
    };
    const timer = setInterval(tick, 1000);
    const initial = remaining(endsAt, Date.now(), dayUnit);
    setLeft(initial);
    if (initial === null) clearInterval(timer);
    return () => clearInterval(timer);
  }, [endsAt, dayUnit]);

  return left;
}
