import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, onSocketInstanceChange } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import type { TypingEvent } from '@/types/websocket';

/** Son tuş vuruşundan sonra typing:stop'a kadar beklenen süre. */
const STOP_AFTER_MS = 3000;
/** Sunucu stop göndermezse göstergenin kendiliğinden kapanma süresi. */
const PEER_TIMEOUT_MS = 5000;

/**
 * Mesaj thread'i için "yazıyor" köprüsü.
 *
 * Yayın tarafı debounce'ludur: `typing:start` yalnız yazmaya BAŞLARKEN bir kez
 * gider, `typing:stop` ise son tuş vuruşundan STOP_AFTER_MS sonra. Alım tarafında
 * kendi kendine sönen bir zamanlayıcı var — sunucu `typing:stopped` göndermezse
 * gösterge sonsuza dek takılı kalmaz.
 */
export function useTypingIndicator(threadId: string | undefined) {
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const isTypingRef = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitStop = useCallback(() => {
    if (!threadId || !isTypingRef.current) return;
    isTypingRef.current = false;
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    getSocket()?.emit('typing:stop', { threadId });
  }, [threadId]);

  const notifyTyping = useCallback(() => {
    if (!threadId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket()?.emit('typing:start', { threadId });
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(emitStop, STOP_AFTER_MS);
  }, [threadId, emitStop]);

  // Karşı tarafın typing olaylarını dinle. Soket mount anında hazır olmayabilir
  // (deep-link: aynı commit'te çocuk effect'i kök layout'un `connectSocket()`'inden önce
  // çalışır) ya da sonradan logout/login ile yeni bir örneğe değişebilir — zamanlayıcıyla
  // yoklamak yerine örnek değişimine (`onSocketInstanceChange`) abone olunur.
  useEffect(() => {
    if (!threadId) return undefined;

    let subscribedSocket: ReturnType<typeof getSocket> = null;

    // Sunucu, oda yayınlarını (join:thread) göndericiye de iletiyor — kendi
    // typing olayımızı görmezden gelmezsek kullanıcı kendi yazışını "yazıyor…"
    // olarak görür. `useMessagingSocket.ts`'teki desenle aynı: mevcut kullanıcı
    // kimliği `useAuthStore.getState()`'ten okunur.
    const isOwnEvent = (p: TypingEvent) => {
      const myUserId = useAuthStore.getState().user?.id;
      return !!p.userId && p.userId === myUserId;
    };

    const onStarted = (p: TypingEvent) => {
      if (p.threadId !== threadId || isOwnEvent(p)) return;
      setIsPeerTyping(true);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      peerTimer.current = setTimeout(() => setIsPeerTyping(false), PEER_TIMEOUT_MS);
    };
    const onStopped = (p: TypingEvent) => {
      if (p.threadId !== threadId || isOwnEvent(p)) return;
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };

    const unsubscribe = () => {
      if (!subscribedSocket) return;
      subscribedSocket.off('typing:started', onStarted);
      subscribedSocket.off('typing:stopped', onStopped);
      subscribedSocket = null;
    };

    const trySubscribe = (socket: ReturnType<typeof getSocket> = getSocket()) => {
      if (socket === subscribedSocket) return;
      unsubscribe();
      if (!socket) return;
      socket.on('typing:started', onStarted);
      socket.on('typing:stopped', onStopped);
      subscribedSocket = socket;
    };

    trySubscribe();
    const stopWatching = onSocketInstanceChange(trySubscribe);

    return () => {
      stopWatching();
      unsubscribe();
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };
  }, [threadId]);

  // Ekrandan çıkarken karşı tarafı "yazıyor" halinde bırakma
  useEffect(() => emitStop, [emitStop]);

  return { isPeerTyping, notifyTyping, stopTyping: emitStop };
}
