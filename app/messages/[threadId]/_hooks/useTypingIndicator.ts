import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/** Son tuş vuruşundan sonra typing:stop'a kadar beklenen süre. */
const STOP_AFTER_MS = 3000;
/** Sunucu stop göndermezse göstergenin kendiliğinden kapanma süresi. */
const PEER_TIMEOUT_MS = 5000;
/**
 * `getSocket()` null dönerken veya `disconnectSocket`/`connectSocket` yeni bir
 * instance yarattığında (logout→login, reconnect) yeniden kaydolmak için
 * yoklama aralığı. `join:thread` bu tuzağa `useFocusEffect` ile kaçıyor, ama o
 * yalnız ekrana her dönüşte onarır — deep-link ile ekran, kök layout'un
 * `connectSocket()`'i henüz çalışmadan mount olursa (aynı commit'te çocuk
 * effect'leri ebeveynden önce çalışır) hiç iyileşmezdi. Yoklama, mount sırasına
 * bağlı olmadan hem bu geç-bağlanma yarışını hem de instance değişimini kapsar.
 */
const SOCKET_POLL_MS = 500;

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
  // (deep-link, kök layout'un connectSocket'i henüz çalışmadan) ya da sonradan
  // logout/login ile yeni bir instance'a değişebilir — bu yüzden tek seferlik
  // `getSocket()` yerine hazır olana / değişene kadar yoklanır.
  useEffect(() => {
    if (!threadId) return undefined;

    let subscribedSocket: ReturnType<typeof getSocket> = null;

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

    const unsubscribe = () => {
      if (!subscribedSocket) return;
      subscribedSocket.off('typing:started', onStarted);
      subscribedSocket.off('typing:stopped', onStopped);
      subscribedSocket = null;
    };

    const trySubscribe = () => {
      const socket = getSocket();
      if (socket === subscribedSocket) return;
      unsubscribe();
      if (!socket) return;
      socket.on('typing:started', onStarted);
      socket.on('typing:stopped', onStopped);
      subscribedSocket = socket;
    };

    trySubscribe();
    const pollId = setInterval(trySubscribe, SOCKET_POLL_MS);

    return () => {
      clearInterval(pollId);
      unsubscribe();
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };
  }, [threadId]);

  // Ekrandan çıkarken karşı tarafı "yazıyor" halinde bırakma
  useEffect(() => emitStop, [emitStop]);

  return { isPeerTyping, notifyTyping, stopTyping: emitStop };
}
