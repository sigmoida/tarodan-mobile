import { onlineManager } from '@tanstack/react-query';
import { isOnline, subscribeOnline } from './networkStatus';

/**
 * TanStack Query `onlineManager`'ı cihaz bağlantısına bağlar (React Native'in resmi deseni;
 * `setEventListener` ile). Çevrimdışı → çevrimiçi geçişinde eskimiş (stale) / hatalı sorgular
 * kendiliğinden tazelenir (`refetchOnReconnect`). `queryClient` modülü yüklenirken kurulur, yani
 * ilk sorgudan ÖNCE; izlemenin kendisi (`startNetworkTracking`) `NetworkMonitor`da başlar.
 */
export function installOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    setOnline(isOnline());
    return subscribeOnline(setOnline);
  });
}
