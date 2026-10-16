import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types';
import { getApiBaseUrl, refreshAccessTokenNow } from '@/lib/api';

export function socketRootUrl(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/*
 * Kimlik hatasından kurtarma. Sunucu geçersiz/süresi dolmuş token'da `error` olayı
 * ("Invalid authentication token" / "Authentication required") gönderip bağlantıyı SUNUCU
 * tarafında keser; socket.io istemcisi sunucunun kestiği bağlantıyı kendiliğinden yeniden
 * kurmaz → socket oturum boyunca ölü kalıyordu. Burada sessiz refresh tetiklenir (HTTP 401'leriyle
 * aynı tek-uçuş); yeni token store'a yazılınca `useMessagingSocket` `connectSocket(yeni)` ile
 * yeniden bağlanır. Art arda deneme sınırlı; sunucu bağlantıyı kabul edince (`connected`) sıfırlanır.
 */
const AUTH_ERROR_MESSAGES = new Set(['Invalid authentication token', 'Authentication required']);
const MAX_AUTH_RECOVERY_ATTEMPTS = 3;
/** Store güncellemesiyle yeniden bağlanmadıysa (token zaten aynıydı) yedek bağlanma gecikmesi. */
const AUTH_RECOVERY_FALLBACK_MS = 1000;
let authRecoveryAttempts = 0;
let authRecoveryInFlight = false;

async function recoverFromAuthError(s: AppSocket): Promise<void> {
  if (authRecoveryInFlight || authRecoveryAttempts >= MAX_AUTH_RECOVERY_ATTEMPTS) return;
  authRecoveryInFlight = true;
  authRecoveryAttempts += 1;
  try {
    const fresh = await refreshAccessTokenNow();
    if (!fresh || socket !== s) return;
    setTimeout(() => {
      if (socket !== s || s.connected || s.active) return;
      s.auth = { token: fresh };
      s.connect();
    }, AUTH_RECOVERY_FALLBACK_MS);
  } catch {
    /* yenilenemedi — oturum kararı bir sonraki HTTP 401'inde verilir */
  } finally {
    authRecoveryInFlight = false;
  }
}

export function connectSocket(token: string): AppSocket {
  if (socket) {
    socket.auth = { token };
    // `active`: bağlanıyor ya da yeniden bağlanma bekliyor — yeni token sonraki denemede kullanılır.
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }
  const created: AppSocket = io(socketRootUrl(getApiBaseUrl()), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  created.on('connected', () => {
    authRecoveryAttempts = 0;
  });
  created.on('error', (payload) => {
    if (AUTH_ERROR_MESSAGES.has(payload?.message)) void recoverFromAuthError(created);
  });
  socket = created;
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket(): void {
  authRecoveryAttempts = 0;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
