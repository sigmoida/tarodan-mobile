import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket, onSocketInstanceChange } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { useMessagesStore } from '@/stores/messagesStore';
import { qk } from '@/lib/query';
import {
  applyIncomingToCache,
  applyMessagesReadToCache,
} from '@/lib/messaging/cache';
import { invalidateForNewNotification } from '@/hooks/useBadgePoll';
import { useSocketAppLifecycle } from './useSocketAppLifecycle';

/**
 * #77: global mesaj socket dinleyicileri — eski _layout store-action'ları yerine
 * React Query cache köprüsü. Oturum açıkken bağlanır, kapanınca kopar.
 *
 * Aktif thread ayrımı `messagesStore.currentThreadId`'den okunur (o hâlâ client/UI
 * state olarak kalıyor); açık thread'e gelen mesaj listeye eklenir, kapalı thread
 * için okunmamış sayaçları artar.
 */
export function useMessagingSocket() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);

  // Kopukluk sonrası (otomatik yeniden bağlanma VEYA arka plandan dönüş) kaçırılanları topla:
  // açık thread odasına yeniden gir, mesaj/thread/okunmamış sorgularını tazele.
  const resync = useCallback(() => {
    const tid = useMessagesStore.getState().currentThreadId;
    if (tid) {
      getSocket()?.emit('join:thread', { threadId: tid });
      qc.invalidateQueries({ queryKey: qk.messaging.messages(tid) });
    }
    qc.invalidateQueries({ queryKey: qk.messaging.threads });
    qc.invalidateQueries({ queryKey: qk.messaging.unreadCount });
  }, [qc]);

  // Arka planda soket kapanır, ön plana dönüşte yeniden bağlanıp `resync` çalışır.
  useSocketAppLifecycle(resync);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    // Arka plandayken (ör. sessiz token yenilemesi) BAĞLANILMAZ: ön plana dönüşte
    // `useSocketAppLifecycle` taze token'la bağlar. Dinleyiciler yine de örneğe bağlanır.
    if (AppState.currentState !== 'background') connectSocket(token);

    const onMessageNew = (p: { threadId: string; message: any }) => {
      const myUserId = useAuthStore.getState().user?.id;
      const isOpen = useMessagesStore.getState().currentThreadId === p.threadId;
      applyIncomingToCache(qc, p.threadId, p.message, { isOpen, myUserId });
    };
    const onThreadUpdated = () => {
      qc.invalidateQueries({ queryKey: qk.messaging.unreadCount });
    };
    const onMessageRead = (p: { threadId: string; messageIds: string[] }) => {
      applyMessagesReadToCache(qc, p.threadId, p.messageIds || []);
    };
    const onReconnect = resync;
    // Yeni bildirim (teklif / takas / sipariş…): push alımıyla AYNI yardımcı (liste + rozetler).
    const onNotificationNew = () => invalidateForNewNotification(qc);

    // Dinleyiciler soket ÖRNEĞİNE bağlanır; örnek sonradan oluşursa (arka planda token geldi,
    // ön plana dönüşte bağlanıldı) `onSocketInstanceChange` ile yeni örneğe taşınır.
    type AppSocket = NonNullable<ReturnType<typeof getSocket>>;
    let attached: AppSocket | null = null;
    const detach = () => {
      if (!attached) return;
      attached.off('message:new', onMessageNew);
      attached.off('notification:new', onNotificationNew);
      attached.off('thread:updated', onThreadUpdated);
      attached.off('message:read', onMessageRead);
      attached.io.off('reconnect', onReconnect);
      attached = null;
    };
    const attach = (socket: ReturnType<typeof getSocket>) => {
      if (socket === attached) return;
      detach();
      if (!socket) return;
      socket.on('message:new', onMessageNew);
      socket.on('notification:new', onNotificationNew);
      socket.on('thread:updated', onThreadUpdated);
      socket.on('message:read', onMessageRead);
      socket.io.on('reconnect', onReconnect);
      attached = socket;
    };
    attach(getSocket());
    const stopWatching = onSocketInstanceChange(attach);
    return () => {
      stopWatching();
      detach();
    };
  }, [token, qc, resync]);
}
