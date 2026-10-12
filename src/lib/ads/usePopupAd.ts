import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAds } from '@/hooks/useAds';
import type { ActiveAd } from '@/lib/api';
import { newRotationSeed, pickAd } from './pickAd';
import { canShowPopupAd, markPopupAdShown } from './popupFrequency';

/**
 * Ekran hazır olduktan sonra popup'ın açılmasına kadar bekleme. Web 3 sn; burada
 * ana sayfanın misafir kayıt istemi (SignupPrompt, 3 sn'de açılan Modal) ile
 * aynı ana denk gelmesin diye biraz geç — iki Modal'ın aynı anda açılması
 * iOS'ta ekranı dondurabilir.
 */
export const POPUP_AD_DELAY_MS = 3500;

/**
 * Popup reklamı: cihaz başına 24 saatte en çok bir kez, yalnız `blocked`
 * değilken (başka bir Modal/istem açık değilken), ekran odaktayken ve
 * `POPUP_AD_DELAY_MS` sonra. Bir engel gecikme süresinde çıkarsa sayaç iptal
 * olur, kalkınca yeniden başlar. Gösterim anında damga atılır — kapatılmasa da
 * uygulama yeniden açılınca tekrar çıkmaz. Reklamsız üyede/reklam yoksa hiç çıkmaz.
 */
export function usePopupAd(blocked: boolean): { ad: ActiveAd | null; close: () => void } {
  const { ads, isAdFree } = useAds('popup');
  const [seed] = useState(newRotationSeed);
  const candidate = isAdFree ? null : pickAd(ads, 'popup', seed);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  // `null`: depodan henüz okunmadı.
  const [capAllows, setCapAllows] = useState<boolean | null>(null);
  const [shown, setShown] = useState<ActiveAd | null>(null);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    canShowPopupAd().then((ok) => {
      if (!cancelled) setCapAllows(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCandidate = !!candidate;
  useEffect(() => {
    if (!hasCandidate || capAllows !== true || done || shown || blocked || !focused) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Depo başka bir yerden güncellenmiş olabilir (ör. yarışan ikinci örnek).
      if (!(await canShowPopupAd())) {
        if (!cancelled) setDone(true);
        return;
      }
      const ad = candidateRef.current;
      // Beklerken bir engel çıktıysa açma — engel kalkınca sayaç yeniden kurulur.
      if (cancelled || !ad || blockedRef.current) return;
      setShown(ad);
      void markPopupAdShown();
    }, POPUP_AD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasCandidate, capAllows, done, shown, blocked, focused]);

  const close = useCallback(() => {
    setShown(null);
    setDone(true);
  }, []);

  return { ad: shown, close };
}
