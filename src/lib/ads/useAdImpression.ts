import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adsApi } from '@/lib/api';

/** Gösterim sayılması için reklamın görünür kalması gereken süre (web: 1 sn). */
export const IMPRESSION_DWELL_MS = 1000;

/**
 * Gösterim sayacı — mount'ta değil, reklam GERÇEKTEN görünürken.
 *
 * `ready`: reklam çizildi (görselli reklamda görsel yüklendi). Ayrıca ekran
 * odakta ve uygulama önde olmalı; bu koşullar `IMPRESSION_DWELL_MS` boyunca
 * sürerse gösterim reklam başına BİR kez gönderilir. Başka sekmede/ekranda
 * arkada kalan ya da arka plana atılan uygulamadaki reklam sayılmaz.
 *
 * Bilinçli sadeleştirme: web'deki gibi %50 kesişim ölçümü yok (RN'de
 * IntersectionObserver yok); yuvalar ekranın üstünde durduğu için ekran odağı
 * + yükleme + bekleme yeterli bir vekil.
 */
export function useAdImpression(
  adId: string,
  ready: boolean,
  /** Sayaç ucu; varsayılan reklam ucu. Hero slaytı kendi ucunu verir. */
  record: (id: string) => Promise<unknown> = adsApi.recordImpression,
): void {
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const sentFor = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready || !focused || !appActive || sentFor.current === adId) return;
    const timer = setTimeout(() => {
      sentFor.current = adId;
      record(adId).catch(() => {});
    }, IMPRESSION_DWELL_MS);
    return () => clearTimeout(timer);
  }, [adId, ready, focused, appActive, record]);
}
