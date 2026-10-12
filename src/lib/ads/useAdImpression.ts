import { useEffect, useRef } from 'react';
import { adsApi } from '@/lib/api';
import { useScreenActive } from './useScreenActive';

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
  const screenActive = useScreenActive();
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !screenActive || sentFor.current === adId) return;
    const timer = setTimeout(() => {
      sentFor.current = adId;
      record(adId).catch(() => {});
    }, IMPRESSION_DWELL_MS);
    return () => clearTimeout(timer);
  }, [adId, ready, screenActive, record]);
}
