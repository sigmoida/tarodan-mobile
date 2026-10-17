import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createForegroundTracker } from '@/lib/query/focusManager';
import { messagesApi } from '@/lib/api';
import { isJwtExpired } from '@/lib/auth/jwtExpiry';
import { connectSocket, getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

/**
 * Arka plana geçişten kopmaya kadar bekleme. Android'de görsel/belge seçici ve paylaşım sayfası
 * uygulamayı `background` yapar: her ek seçiminde kop / bağlan / resync olmasın.
 */
export const SOCKET_BACKGROUND_GRACE_MS = 30_000;
/** Bu kadar içinde dolacak access token "dolmuş" sayılır (saat kayması payı). */
const TOKEN_EXPIRY_SKEW_MS = 30_000;

/**
 * Ön plana dönüşte bağlanılacak token. Süresi dolmuşsa önce MEVCUT yenileme yolu çalışır:
 * kimlikli bir istek (okunmamış mesaj sayısı) 401 alır → axios interceptor'ı tek-uçuş refresh
 * yapar ve yeni token'ı store'a yazar (`syncStoreAccessToken`). Yenileme geçici hatayla
 * düştüyse (ağ) token hâlâ dolmuştur → `null`: bu dönüşte bağlanılmaz, sonraki ön plana
 * dönüşte yeniden denenir. Kesin red → oturum kapanır (token null) → yine `null`.
 */
async function freshTokenForConnect(): Promise<string | null> {
  const token = useAuthStore.getState().token;
  if (!token) return null;
  if (!isJwtExpired(token, TOKEN_EXPIRY_SKEW_MS)) return token;
  try {
    await messagesApi.getUnreadCount();
  } catch {
    /* geçici / kesin hata — aşağıdaki kontrol karar verir */
  }
  const next = useAuthStore.getState().token;
  if (!next || isJwtExpired(next)) return null;
  return next;
}

/**
 * Soketi uygulama yaşam döngüsüne bağlar: arka planda (kısa bir bekleme sonrası) bağlantı
 * KAPATILIR (pil / veri), gerçek ön plana dönüşte taze token'la yeniden bağlanır.
 *
 * - Örnek korunur (`disconnectSocket` DEĞİL, `socket.disconnect()`): dinleyiciler örnekte kalır.
 * - Elle `connect()` Manager'ın `reconnect` olayını tetiklemez; kaçırılan mesajlar için
 *   `onResumed` (odaya yeniden katıl + mesaj sorgularını tazele) `connect` olayında bir kez çalışır.
 * - Bekleme süresi içinde dönülürse hiçbir şey yapılmaz (soket hiç kopmadı).
 * - iOS `inactive` sıçraması (Face ID, sistem penceresi) sayılmaz — `createForegroundTracker`.
 */
export function useSocketAppLifecycle(onResumed: () => void): void {
  const hasToken = useAuthStore((s) => !!s.token);

  useEffect(() => {
    if (!hasToken) return undefined;
    const track = createForegroundTracker();
    let pending: ReturnType<typeof getSocket> = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    // Ön plan dönüşü kuşağı: token tazelenirken yine arka plana geçildiyse bağlanılmaz.
    let generation = 0;
    let disposed = false;

    const clearPending = () => {
      pending?.off('connect', onResumed);
      pending = null;
    };
    const clearGrace = () => {
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = null;
    };

    const resume = async () => {
      const gen = ++generation;
      if (getSocket()?.connected) return;
      const token = await freshTokenForConnect();
      if (disposed || gen !== generation || !token || getSocket()?.connected) return;
      clearPending();
      pending = connectSocket(token);
      pending.once('connect', onResumed);
    };

    const sub = AppState.addEventListener('change', (next) => {
      const transition = track(next);
      if (transition === 'background') {
        generation += 1;
        clearPending();
        clearGrace();
        graceTimer = setTimeout(() => {
          graceTimer = null;
          getSocket()?.disconnect();
        }, SOCKET_BACKGROUND_GRACE_MS);
      } else if (transition === 'foreground') {
        clearGrace();
        void resume();
      }
    });
    return () => {
      disposed = true;
      sub.remove();
      clearGrace();
      clearPending();
    };
  }, [hasToken, onResumed]);
}
