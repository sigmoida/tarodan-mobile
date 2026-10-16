import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAds } from '@/hooks/useAds';
import type { ActiveAd } from '@/lib/api';
import { newRotationSeed, pickAd } from './pickAd';
import {
  canShowPopupAd,
  clearLegacyPopupStampOnce,
  clearPopupAdShown,
  filterDismissedPopupAds,
  isLegacyPopupResponse,
  markPopupAdDismissed,
  markPopupAdShown,
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
 * Popup'ın kendi açtığı bağlantıdan geri dönüş penceresi: bağlantı açıldıktan sonra bu süre
 * içinde ana sekme odağı kaybederse, sonraki odak yeni ziyaret SAYILMAZ (popup kendi
 * hedefinden dönünce yeniden çıkmasın). Hedef ana sekmenin kendisiyse (odak kaybı yok) ya da
 * dış uygulamaysa bayrak süre dolunca düşer — sonraki gerçek ziyareti yutmaz.
 */
export const POPUP_LINK_RETURN_WINDOW_MS = 2000;

export interface PopupAdState {
  ad: ActiveAd | null;
  /** Kullanıcı kapattı (X, arka plan, geri tuşu). */
  close: () => void;
  /** Kullanıcı reklam bağlantısına dokundu: kapatır + dönüş odağını yeni ziyaret saymaz. */
  closeForLink: () => void;
}

/**
 * Popup reklamı (yalnız ana sayfada bağlı). Sıklık `popupFrequency.ts`'de: yeni API'de reklam
 * başına (`until_dismissed` / `every_visit`), eski API'de (alanlar yok) global 24 saat damgası.
 *
 * - **Ziyaret**: ana sekme her ODAK kazandığında (soğuk açılış = ilk odak, sekmeye dönüş,
 *   üstteki ekrandan geri gelme) yeni bir ziyaret başlar ve popup yeniden değerlendirilir.
 *   İstisna: popup'ın kendi açtığı bağlantıdan dönüş yeni ziyaret değildir (`closeForLink`).
 * - **Arka plan**: uygulamanın arka plandan öne gelmesi odak olayı DEĞİLDİR, yeni ziyaret açmaz.
 *   Bu ziyarette gösterilmiş/kapatılmış popup yeniden çıkmaz. Popup henüz açılmamışsa (gecikme
 *   sürerken uygulama arka plana gittiyse) sayaç iptal olur ve öne dönünce BAŞTAN (tam
 *   `POPUP_AD_DELAY_MS`) kurulur.
 * - Ziyaret başına en çok bir popup; kapatılmış reklamlar `pickAd`'den ÖNCE elenir.
 * - `close`/`closeForLink` KULLANICI kapatmasıdır: yeni API'de `until_dismissed` anahtarı yazılır.
 *
 * Korumalar: reklamsız üyede/reklam yoksa hiç çıkmaz; girişli kullanıcıda üyelik hakları
 * (`limitsReady`) belli olmadan sayaç başlamaz; ekran odakta/önde değilken açılmaz;
 * `POPUP_AD_DELAY_MS` sonra açılır, gecikmede engel çıkarsa sayaç iptal olur.
 * Popup açıkken `blocked` olursa (başka Modal/istem, yan menü) popup AYNI render'da gizlenir
 * ve bu ziyaret için kapanır — iki native sunum aynı anda olmaz; kullanıcı kapatmadığı için
 * "kapatıldı" yazılmaz. Açıkken üye reklamsız çıkarsa da kapanır, "kapatıldı" yazılmaz ve eski
 * yolda gösterim damgası geri alınır.
 */
export function usePopupAd(blocked: boolean): PopupAdState {
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
  const linkOpenedAtRef = useRef<number | null>(null);
  const skipNextFocusRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRef.current) skipNextFocusRef.current = false;
      else setVisit((v) => v + 1);
      return () => {
        const openedAt = linkOpenedAtRef.current;
        linkOpenedAtRef.current = null;
        skipNextFocusRef.current = openedAt != null && Date.now() - openedAt < POPUP_LINK_RETURN_WINDOW_MS;
      };
    }, []),
  );
  // Bu ziyarette popup değerlendirmesi bitti mi (gösterildi+kapandı ya da aday yok).
  const [doneVisit, setDoneVisit] = useState(0);
  const done = doneVisit === visit;

  const [shown, setShown] = useState<ActiveAd | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // Gösterilen popup eski yoldan mı (global damga) — kapatma/geri alma buna göre.
  const shownLegacyRef = useRef(false);
  const markedRef = useRef<Promise<void> | null>(null);
  // Ekran odakta + uygulama önde (hero/gösterim sayacıyla aynı tek kaynak).
  const active = useScreenActive();

  useEffect(() => {
    if (visit === 0 || !eligible || done || shown || blocked || !active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const list = adsRef.current;
      const legacy = isLegacyPopupResponse(list);
      let candidates: ActiveAd[];
      if (legacy) {
        if (!(await canShowPopupAd())) {
          if (!cancelled) setDoneVisit(visit);
          return;
        }
        candidates = list;
      } else {
        void clearLegacyPopupStampOnce();
        candidates = await filterDismissedPopupAds(list);
      }
      // Beklerken bir engel çıktıysa açma — engel kalkınca sayaç yeniden kurulur.
      if (cancelled || blockedRef.current) return;
      const ad = pickAd(candidates, 'popup', seed);
      if (!ad) {
        setDoneVisit(visit);
        return;
      }
      shownLegacyRef.current = legacy;
      setShown(ad);
      if (legacy) markedRef.current = markPopupAdShown();
    }, POPUP_AD_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visit, eligible, done, shown, blocked, active, seed]);

  // Açıkken başka bir sunum/yan menü geldi: bu ziyaret için kapat ("kapatıldı" yazılmaz).
  useEffect(() => {
    if (!blocked || !shown) return;
    setShown(null);
    setDoneVisit(visitRef.current);
  }, [blocked, shown]);

  // Açıkken üye reklamsız çıktı: kapat; eski yolda damgayı geri al (yazım bitince sil).
  useEffect(() => {
    if (!isAdFree || !shown) return;
    setShown(null);
    setDoneVisit(visitRef.current);
    if (shownLegacyRef.current) {
      void (markedRef.current ?? Promise.resolve()).then(() => clearPopupAdShown());
    }
  }, [isAdFree, shown]);

  const close = useCallback(() => {
    const ad = shownRef.current;
    if (ad && !shownLegacyRef.current) void markPopupAdDismissed(ad);
    setShown(null);
    setDoneVisit(visitRef.current);
  }, []);

  const closeForLink = useCallback(() => {
    linkOpenedAtRef.current = Date.now();
    close();
  }, [close]);

  // `blocked` olduğu render'da gizle (efektin işlemesini beklemeden).
  return { ad: blocked ? null : shown, close, closeForLink };
}
