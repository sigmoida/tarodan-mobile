import { useEffect, useRef, useState } from 'react';

/** Marka fontu için splash'in en fazla bekleyeceği süre (ms). */
export const FONT_WAIT_MAX_MS = 4000;

/**
 * Marka fontunun BU OTURUM için açık olup olmadığını ve splash'in beklemeyi bırakıp
 * bırakmayacağını söyler.
 *
 * Süre (`maxMs`) dolduğunda font hâlâ yüklenmediyse oturum SİSTEM FONTUNDA kalır: font sonradan
 * yüklense bile oturum içinde marka fontuna geçilmez (geçiş tüm metni kaydırır, ekran zıplar).
 * Önbelleğe düşen font sonraki açılışta zamanında gelir. Hata olursa da sistem fontu.
 */
export function useBrandFontSession(
  fontsLoaded: boolean,
  fontError: unknown,
  maxMs: number = FONT_WAIT_MAX_MS,
): { settled: boolean; enabled: boolean } {
  const loadedRef = useRef(fontsLoaded);
  loadedRef.current = fontsLoaded;
  const [waitExpired, setWaitExpired] = useState(false);
  // Süre dolduğunda font henüz yoksa: oturum boyunca sistem fontu (kilit).
  const [lockedOut, setLockedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!loadedRef.current) setLockedOut(true);
      setWaitExpired(true);
    }, maxMs);
    return () => clearTimeout(id);
  }, [maxMs]);

  return {
    settled: fontsLoaded || !!fontError || waitExpired,
    enabled: fontsLoaded && !fontError && !lockedOut,
  };
}
