import { useCallback, useEffect, useRef, useState } from 'react';
import { useAds } from '@/hooks/useAds';
import type { ActiveAd } from '@/lib/api';
import { newRotationSeed, pickAd } from './pickAd';
import { canShowPopupAd, clearPopupAdShown, markPopupAdShown } from './popupFrequency';
import { useScreenActive } from './useScreenActive';

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
 *
 * Reklamsız üye yarışı: girişli kullanıcıda üyelik hakları (`limitsReady`)
 * belli olmadan aday seçilmez ve sayaç başlamaz (misafirde beklenmez). Popup
 * açıkken `isAdFree` true olursa popup kapanır ve az önce atılan damga geri
 * alınır — üye görmediği/görmemesi gereken bir popup için 24 saat kilitlenmez.
 */
export function usePopupAd(blocked: boolean): { ad: ActiveAd | null; close: () => void } {
  const { ads, isAdFree, limitsReady } = useAds('popup');
  const [seed] = useState(newRotationSeed);
  const candidate = isAdFree || !limitsReady ? null : pickAd(ads, 'popup', seed);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  // `null`: depodan henüz okunmadı.
  const [capAllows, setCapAllows] = useState<boolean | null>(null);
  const [shown, setShown] = useState<ActiveAd | null>(null);
  const [done, setDone] = useState(false);
  const markedRef = useRef<Promise<void> | null>(null);
  // Ekran odakta + uygulama önde (hero/gösterim sayacıyla aynı tek kaynak).
  const focused = useScreenActive();

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
      markedRef.current = markPopupAdShown();
    }, POPUP_AD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasCandidate, capAllows, done, shown, blocked, focused]);

  // Açıkken üye reklamsız çıktı: kapat, damgayı geri al (yazım bitince sil).
  useEffect(() => {
    if (!isAdFree || !shown) return;
    setShown(null);
    setDone(true);
    void (markedRef.current ?? Promise.resolve()).then(() => clearPopupAdShown());
  }, [isAdFree, shown]);

  const close = useCallback(() => {
    setShown(null);
    setDone(true);
  }, []);

  return { ad: shown, close };
}
