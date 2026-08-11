import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import type { Notification } from '../_lib/types';
import { routeForNotification } from '../_lib/route';

type NotificationsPayload = { list: Notification[]; unreadCount: number };

/**
 * Liste + okunmamış sayısı TEK sorguda.
 *
 * İkisi birlikte tutarlı olmalı: ayrı sorgular olsaydı biri tazelenip diğeri
 * bayat kalabilir ve rozet listeyle çelişirdi. Sayaç ucu düşerse sorgu
 * düşmez — yüklü sayfadan türetilir (mevcut davranış korundu).
 */
async function fetchNotifications(): Promise<NotificationsPayload> {
  const [listRes, countRes] = await Promise.all([
    notificationsApi.getAll(),
    notificationsApi.getUnreadCount().catch(() => null),
  ]);

  // Backend `GET /notifications` → `{ notifications, unreadCount, pagination }`.
  // Axios interceptor gövdeyi sarmıyor; data/dizi yedekleri yanıt şekli
  // değişirse diye duruyor.
  const body = listRes.data as any;
  const list: Notification[] = Array.isArray(body?.notifications)
    ? body.notifications
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body)
        ? body
        : [];

  const c = (countRes?.data as any)?.count ?? (countRes?.data as any)?.data?.count;
  const unreadCount =
    typeof c === 'number' ? c : list.filter((n: any) => !(n.read || n.isRead)).length;

  return { list, unreadCount };
}

/**
 * Bildirimler controller'ı.
 *
 * Elle `useState + useEffect + api` yerine React Query (CLAUDE.md §6). Kazanç
 * davranışsal: okundu işaretleme artık yalnız yerel state'i değil sorguyu da
 * güncelliyor, yani başka bir ekran aynı listeyi okuduğunda tutarlı görüyor.
 * Dokunma anındaki his korunuyor — önce iyimser güncelleme, sonra tazeleme.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.notifications.list,
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
  });

  const data = query.data ?? { list: [], unreadCount: 0 };

  /** Sorgu önbelleğini yerinde günceller — ağ beklemeden liste tepki verir. */
  const patchCache = useCallback(
    (fn: (prev: NotificationsPayload) => NotificationsPayload) => {
      queryClient.setQueryData<NotificationsPayload>(qk.notifications.list, (prev) =>
        fn(prev ?? { list: [], unreadCount: 0 }),
      );
    },
    [queryClient],
  );

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onMutate: (id) => {
      patchCache((prev) => ({
        list: prev.list.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.list });
      // Anasayfa rozeti ayrı sorgu — o da tazelensin.
      queryClient.invalidateQueries({ queryKey: qk.notifications.unread });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: () => {
      patchCache((prev) => ({
        list: prev.list.map((n) => ({ ...n, read: true, isRead: true })),
        unreadCount: 0,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.list });
      queryClient.invalidateQueries({ queryKey: qk.notifications.unread });
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: qk.notifications.list });
    }, [isAuthenticated, queryClient]),
  );

  // Bildirimler gizli bir tab; home/profil'den push ile açılıyor. Header'da geri
  // butonu olmayınca kullanıcı çıkamıyordu (trades ekranıyla aynı desen).
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handlePress = useCallback(
    (notification: Notification) => {
      if (!(notification.read || notification.isRead)) markAsRead.mutate(notification.id);

      // Hedef kararı TEK katmanda (tip istisnaları, `data` kimlikleri, link
      // eşlemesi ve güvenlik kapısı orada). Hedef yoksa gezinme YOK — satır
      // okundu işaretlenir, kullanıcı alakasız bir ekrana atılmaz.
      const target = routeForNotification(notification);
      if (target) router.push(target as never);
    },
    [markAsRead],
  );

  return {
    isAuthenticated,
    notifications: data.list,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    unreadCount: data.unreadCount,
    handleRefresh: () => query.refetch(),
    handleBack,
    handlePress,
    handleMarkAllAsRead: () => markAllAsRead.mutate(),
  };
}

export type NotificationsController = ReturnType<typeof useNotifications>;
