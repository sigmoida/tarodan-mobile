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
 * yeniden bağlanır. Art arda deneme sınırlı. Sayaç sıfırlanır: sunucu bağlantıyı kabul edince
 * (`connected`), token değişince (HTTP tarafında yenilendi) ya da bekleme süresi dolunca — sonraki
 * gerçek süre dolmaları yine kurtarılır.
 */
const AUTH_ERROR_MESSAGES = new Set(['Invalid authentication token', 'Authentication required']);
const MAX_AUTH_RECOVERY_ATTEMPTS = 3;
/** Sınır dolduktan sonra yeniden denemeye izin verilene kadarki bekleme. */
const AUTH_RECOVERY_COOLDOWN_MS = 60_000;
/** Store güncellemesiyle yeniden bağlanmadıysa (token zaten aynıydı) yedek bağlanma gecikmesi. */
const AUTH_RECOVERY_FALLBACK_MS = 1000;
let authRecoveryAttempts = 0;
let authRecoveryInFlight = false;
let authRecoveryExhaustedAt: number | null = null;

function resetAuthRecovery(): void {
  authRecoveryAttempts = 0;
  authRecoveryExhaustedAt = null;
}

async function recoverFromAuthError(s: AppSocket): Promise<void> {
  if (authRecoveryInFlight) return;
  if (authRecoveryAttempts >= MAX_AUTH_RECOVERY_ATTEMPTS) {
    if (Date.now() - (authRecoveryExhaustedAt ?? 0) < AUTH_RECOVERY_COOLDOWN_MS) return;
    resetAuthRecovery();
  }
  authRecoveryInFlight = true;
  authRecoveryAttempts += 1;
  if (authRecoveryAttempts >= MAX_AUTH_RECOVERY_ATTEMPTS) authRecoveryExhaustedAt = Date.now();
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
    const previous = (socket.auth as { token?: string } | undefined)?.token;
    // Token değişti (HTTP tarafında yenilendi / yeni oturum): kurtarma sayacı baştan.
    if (previous !== token) resetAuthRecovery();
    socket.auth = { token };
    // `active`: bağlanıyor ya da yeniden bağlanma bekliyor — yeni token sonraki denemede kullanılır.
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }
  resetAuthRecovery();
  const created: AppSocket = io(socketRootUrl(getApiBaseUrl()), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  created.on('connected', () => {
    resetAuthRecovery();
  });
  created.on('error', (payload) => {
    if (AUTH_ERROR_MESSAGES.has(payload?.message)) void recoverFromAuthError(created);
  });
  socket = created;
  notifySocketInstanceChange();
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket(): void {
  resetAuthRecovery();
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
