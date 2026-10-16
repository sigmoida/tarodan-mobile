import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAds } from '@/hooks/useAds';
import type { ActiveAd } from '@/lib/api';
import { newRotationSeed, pickAd } from './pickAd';
import {
  filterDismissedPopupAds,
  markPopupAdDismissed,
  popupDismissKey,
  popupFrequencyOf,
} from './popupFrequency';
import { useScreenActive } from './useScreenActive';

/**
 * Ekran hazır olduktan sonra popup'ın açılmasına kadar bekleme. Web 3 sn; burada
 * ana sayfanın misafir kayıt istemi (SignupPrompt, 3 sn'de açılan Modal) ile
 * aynı ana denk gelmesin diye biraz geç — iki Modal'ın aynı anda açılması
 * iOS'ta ekranı dondurabilir.
 */
export const POPUP_AD_DELAY_MS = 3500;

/**
 * Popup reklamı (yalnız ana sayfada bağlı). Sıklık reklam başınadır (`popupFrequency.ts`):
 *
 * - **Ziyaret**: ana sekme her ODAK kazandığında (soğuk açılış = ilk odak, sekmeye dönüş,
 *   üstteki ekrandan geri gelme) yeni bir ziyaret başlar ve popup yeniden değerlendirilir.
 *   Uygulamanın arka plandan öne gelmesi odak olayı DEĞİLDİR: yeni ziyaret açmaz, bu ziyarette
 *   gösterilmiş/kapatılmış popup yeniden çıkmaz (henüz açılmamışsa sayaç kaldığı yerden kurulur).
 * - Ziyaret başına en çok bir popup; açılmadan önce kapatılmış (`until_dismissed` + anahtar)
 *   reklamlar `pickAd`'den ÖNCE elenir.
 * - `close` KULLANICI kapatmasıdır (X, arka plan, geri tuşu, reklama dokunma): `until_dismissed`
 *   ise anahtar yazılır; `every_visit` hiçbir şey yazmaz.
 *
 * Korumalar: reklamsız üyede/reklam yoksa hiç çıkmaz; girişli kullanıcıda üyelik hakları
 * (`limitsReady`) belli olmadan sayaç başlamaz; `blocked` iken (başka Modal/istem açık) ve ekran
 * odakta/önde değilken açılmaz; `POPUP_AD_DELAY_MS` sonra açılır, gecikmede engel çıkarsa sayaç
 * iptal olur. Popup açıkken üye reklamsız çıkarsa popup kapanır ve "kapatıldı" YAZILMAZ —
 * kullanıcı görmemesi gereken bir popup'ı kapatmış sayılmaz (eski damga geri alımının karşılığı).
 */
export function usePopupAd(blocked: boolean): { ad: ActiveAd | null; close: () => void } {
  const { ads, isAdFree, limitsReady } = useAds('popup');
  const [seed] = useState(newRotationSeed);
  const eligible = !isAdFree && limitsReady && ads.length > 0;
  const adsRef = useRef(ads);
  adsRef.current = ads;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  // 0: henüz odak gelmedi. Her odakta artar (yeni ziyaret).
  const [visit, setVisit] = useState(0);
  const visitRef = useRef(visit);
  visitRef.current = visit;
  useFocusEffect(
    useCallback(() => {
      setVisit((v) => v + 1);
    }, []),
  );
  // Bu ziyarette popup değerlendirmesi bitti mi (gösterildi+kapandı ya da aday yok).
  const [doneVisit, setDoneVisit] = useState(0);
  const done = doneVisit === visit;

  const [shown, setShown] = useState<ActiveAd | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // Bu oturumda kapatılanlar: depo yazımı bitmeden yeni ziyaret başlasa da tekrar çıkmasın.
  const dismissedThisSession = useRef(new Set<string>());
  // Ekran odakta + uygulama önde (hero/gösterim sayacıyla aynı tek kaynak).
  const active = useScreenActive();

  useEffect(() => {
    if (visit === 0 || !eligible || done || shown || blocked || !active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const open = (await filterDismissedPopupAds(adsRef.current)).filter(
        (ad) => !dismissedThisSession.current.has(popupDismissKey(ad)),
      );
      // Beklerken bir engel çıktıysa açma — engel kalkınca sayaç yeniden kurulur.
      if (cancelled || blockedRef.current) return;
      const ad = pickAd(open, 'popup', seed);
      if (!ad) {
        setDoneVisit(visit);
        return;
      }
      setShown(ad);
    }, POPUP_AD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visit, eligible, done, shown, blocked, active, seed]);

  // Açıkken üye reklamsız çıktı: kapat; kullanıcı kapatmadığı için "kapatıldı" yazılmaz.
  useEffect(() => {
    if (!isAdFree || !shown) return;
    setShown(null);
    setDoneVisit(visitRef.current);
  }, [isAdFree, shown]);

  const close = useCallback(() => {
    const ad = shownRef.current;
    if (ad && popupFrequencyOf(ad) === 'until_dismissed') {
      dismissedThisSession.current.add(popupDismissKey(ad));
      void markPopupAdDismissed(ad);
    }
    setShown(null);
    setDoneVisit(visitRef.current);
  }, []);

  return { ad: shown, close };
}
