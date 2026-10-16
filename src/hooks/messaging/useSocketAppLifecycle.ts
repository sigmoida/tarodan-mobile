import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createForegroundTracker } from '@/lib/query/focusManager';
import { connectSocket, getSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

/**
 * Soketi uygulama yaşam döngüsüne bağlar: arka planda bağlantı KAPATILIR (pil / veri; OS zaten
 * bir süre sonra askıya alır, açık kalan soket boşuna ping/yeniden bağlanma denemesi yapar),
 * gerçek ön plana dönüşte AYNI örnek güncel token'la yeniden bağlanır.
 *
 * - Örnek korunur (`disconnectSocket` DEĞİL, `socket.disconnect()`): `useMessagingSocket` ve ekran
 *   dinleyicileri (`typing:*`) örnekte kalır, yeniden kayıt gerekmez.
 * - Elle `connect()` Manager'ın `reconnect` olayını tetiklemez; kaçırılan mesajlar için
 *   `onResumed` (odaya yeniden katıl + mesaj sorgularını tazele) `connect` olayında bir kez çalışır.
 * - iOS `inactive` sıçraması (Face ID, sistem penceresi) sayılmaz — `createForegroundTracker`.
 */
export function useSocketAppLifecycle(onResumed: () => void): void {
  const hasToken = useAuthStore((s) => !!s.token);

  useEffect(() => {
    if (!hasToken) return undefined;
    const track = createForegroundTracker();
    let pending: ReturnType<typeof getSocket> = null;
    const clearPending = () => {
      pending?.off('connect', onResumed);
      pending = null;
    };
    const sub = AppState.addEventListener('change', (next) => {
      const transition = track(next);
      if (transition === 'background') {
        clearPending();
        getSocket()?.disconnect();
      } else if (transition === 'foreground') {
        const token = useAuthStore.getState().token;
        if (!token || getSocket()?.connected) return;
        clearPending();
        pending = connectSocket(token);
        pending.once('connect', onResumed);
      }
    });
    return () => {
      sub.remove();
      clearPending();
    };
  }, [hasToken, onResumed]);
}
