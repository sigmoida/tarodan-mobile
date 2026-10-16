import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  addPushTokenChangeListener,
  syncPushRegistration,
  type PushRegistrationResult,
} from '@/services/push';

/** Başarısız kaydın yeniden deneme gecikmeleri (ms); bittiğinde bir sonraki ön plana kalır. */
export const PUSH_REGISTER_RETRY_DELAYS_MS = [30_000, 120_000, 600_000] as const;

/**
 * Oturum açıkken bu cihazın push kaydını güncel tutar — TEK yer:
 * - giriş / soğuk açılış: izin VERİLMİŞSE sessizce kaydeder (izin İSTEMEZ; ön-izin akışı ister);
 * - kayıt başarısızsa geri çekilmeli yeniden dener (30 sn → 2 dk → 10 dk), sonra ön plana kalır;
 * - uygulama ön plana dönünce: son kayıt başarılı değilse (izin Ayarlar'dan yeni açıldı ya da
 *   kayıt düştü) yeniden dener;
 * - APNs/FCM token'ı yenilenince yeni Expo token'ını yazar.
 *
 * Her yol `syncPushRegistration` üzerinden geçer; o da önceki çıkışın bekleyen push iptalini
 * (`settlePendingPushRevoke`) bekler — iptal yeni kaydı kapatamaz.
 */
export function usePushRegistration(isAuthenticated: boolean, enabled = true): void {
  const lastResult = useRef<PushRegistrationResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      lastResult.current = null;
      return undefined;
    }

    let active = true;
    let running = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    /**
     * `onlyIfChanged`: token olayından gelindi — token son yazılanla aynıysa yazma. Uçuşta bir
     * kayıt varsa yeni çağrı YOK SAYILIR (o kayıt zaten en güncel token'ı alıp yazıyor; olay
     * kendi token alımımızdan da gelebilir — yeniden tetiklemek sonsuz döngü olurdu).
     */
    const run = async (onlyIfChanged = false) => {
      if (!active || running) return;
      running = true;
      clearRetry();
      try {
        const result = await syncPushRegistration({
          onlyIfChanged,
          // Efekt söküldüyse (çıkış / hesap değişimi) token yazılmaz.
          isCurrent: () => active,
        });
        if (!active) return;
        lastResult.current = result;
        if (result === 'failed') {
          const delay = PUSH_REGISTER_RETRY_DELAYS_MS[attempt];
          if (delay !== undefined) {
            attempt += 1;
            retryTimer = setTimeout(() => void run(), delay);
          }
        } else {
          attempt = 0;
        }
      } catch {
        if (active) lastResult.current = 'failed';
      } finally {
        running = false;
      }
    };

    void run();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (lastResult.current === 'registered' || lastResult.current === 'unavailable') return;
      attempt = 0;
      void run();
    });

    // Token yenilenmesi: yalnız token GERÇEKTEN değiştiyse yazılır (`onlyIfChanged`); kendi
    // token alımlarımızın tetiklediği olaylar `addPushTokenChangeListener`'da elenir.
    const removeTokenListener = addPushTokenChangeListener(() => {
      attempt = 0;
      void run(true);
    });

    return () => {
      active = false;
      clearRetry();
      appStateSub.remove();
      removeTokenListener();
    };
  }, [isAuthenticated, enabled]);
}
