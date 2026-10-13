import { useEffect, useRef } from 'react';
import { adsApi } from '@/lib/api';
import { useScreenActive } from './useScreenActive';

/** Gösterim sayılması için reklamın görünür kalması gereken süre (web: 1 sn). */
export const IMPRESSION_DWELL_MS = 1000;

/**
 * Oturum kümesindeki anahtar: yuva + reklam. Aynı reklamı gösteren iki yuva
 * AYRI sayılır (web'de her `BannerSlot` kendi gösterimini sayar).
 */
export const impressionKey = (slotId: string, adId: string) => `${slotId}\u0000${adId}`;

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
  /** Oturum kümesi: gösterimi zaten gönderilmiş reklam yeniden bağlansa da sayılmaz. */
  sent?: Set<string>,
  /** Yuva kimliği (`sent` anahtarı = yuva + reklam); verilmezse yalnız reklam kimliği. */
  slotId?: string,
): void {
  const screenActive = useScreenActive();
  const sentFor = useRef<string | null>(null);
  const key = slotId === undefined ? adId : impressionKey(slotId, adId);

  useEffect(() => {
    if (!ready || !screenActive || sentFor.current === adId || sent?.has(key)) return;
    const timer = setTimeout(() => {
      sentFor.current = adId;
      sent?.add(key);
      record(adId).catch(() => {});
    }, IMPRESSION_DWELL_MS);
    return () => clearTimeout(timer);
  }, [adId, key, ready, screenActive, record, sent]);
}
