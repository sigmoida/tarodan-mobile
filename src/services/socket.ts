import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types';
import { getApiBaseUrl } from '@/lib/api';

export function socketRootUrl(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function connectSocket(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(socketRootUrl(getApiBaseUrl()), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  notifySocketInstanceChange();
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    notifySocketInstanceChange();
  }
}

type SocketInstanceListener = (s: ReturnType<typeof getSocket>) => void;
const instanceListeners = new Set<SocketInstanceListener>();

function notifySocketInstanceChange(): void {
  instanceListeners.forEach((l) => l(socket));
}

/**
 * Soket ÖRNEĞİ değişince (ilk bağlanış, logout → `disconnectSocket` → yeni login) haber verir.
 * Ekran dinleyicileri (`typing:*`) yoklama zamanlayıcısı yerine buna abone olur: deep-link ile
 * ekran kök layout'un `connectSocket()`'inden ÖNCE mount olsa da örnek gelince kaydolur.
 * Aynı örneğin kopup yeniden bağlanması (arka plan, ağ) bildirilmez — dinleyiciler örnekte kalır.
 */
export function onSocketInstanceChange(listener: SocketInstanceListener): () => void {
  instanceListeners.add(listener);
  return () => {
    instanceListeners.delete(listener);
  };
}
