import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

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

  // Karşı tarafın typing olaylarını dinle
  useEffect(() => {
    if (!threadId) return;
    const socket = getSocket();
    if (!socket) return;

    const onStarted = (p: { threadId: string }) => {
      if (p.threadId !== threadId) return;
      setIsPeerTyping(true);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      peerTimer.current = setTimeout(() => setIsPeerTyping(false), PEER_TIMEOUT_MS);
    };
    const onStopped = (p: { threadId: string }) => {
      if (p.threadId !== threadId) return;
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };

    socket.on('typing:started', onStarted);
    socket.on('typing:stopped', onStopped);
    return () => {
      socket.off('typing:started', onStarted);
      socket.off('typing:stopped', onStopped);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };
  }, [threadId]);

  // Ekrandan çıkarken karşı tarafı "yazıyor" halinde bırakma
  useEffect(() => emitStop, [emitStop]);

  return { isPeerTyping, notifyTyping, stopTyping: emitStop };
}
