import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import type { Notification } from '../_lib/types';
import { routeForNotification } from '../_lib/route';
import { navigateTo } from '@/lib/navigation/goTo';
import { trimInfiniteToFirstPage } from '@/lib/query/infinite';

/**
 * Liste bu süreden taze sayılır: sekmeye dönüşte sessiz tazeleme yalnız bayatsa çalışır.
 * (Yeni push gelince `setupPushNotificationRouting` listeyi zaten geçersiz kılar.)
 */
const LIST_STALE_MS = 30_000;

type NotificationsPayload = { list: Notification[]; unreadCount: number; hasMore: boolean };
/** `useInfiniteQuery` önbelleğinin şekli — iyimser güncellemeler bunu düzenler. */
type NotificationsPages = { pages: NotificationsPayload[]; pageParams: unknown[] };

/**
 * Liste + okunmamış sayısı TEK sorguda.
 *
 * İkisi birlikte tutarlı olmalı: ayrı sorgular olsaydı biri tazelenip diğeri
 * bayat kalabilir ve rozet listeyle çelişirdi. Sayaç ucu düşerse sorgu
 * düşmez — yüklü sayfadan türetilir (mevcut davranış korundu).
 */
async function fetchNotifications(page: number): Promise<NotificationsPayload> {
  const [listRes, countRes] = await Promise.all([
    notificationsApi.getAll({ page }),
    // Sayaç YALNIZ ilk sayfada sorulur: rozet listenin tamamına ait, her sayfa
    // için tekrar sormak aynı sayıyı N kez çekmek olurdu.
    page === 1 ? notificationsApi.getUnreadCount().catch(() => null) : Promise.resolve(null),
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

  // Sunucu `{page, limit, total, pages}` döndürüyor (ölçüldü). Alan gelmezse
  // "devamı yok" varsayılır — eski tek-sayfa davranışı.
  const pg = (body?.pagination ?? {}) as { page?: number; pages?: number };
  const hasMore = typeof pg.page === 'number' && typeof pg.pages === 'number' && pg.page < pg.pages;

  return { list, unreadCount, hasMore };
}

/**
 * Bildirimler controller'ı.
 *
 * Elle `useState + useEffect + api` yerine React Query (src/lib/query/CLAUDE.md › Query hooks). Kazanç
 * davranışsal: okundu işaretleme artık yalnız yerel state'i değil sorguyu da
 * güncelliyor, yani başka bir ekran aynı listeyi okuduğunda tutarlı görüyor.
 * Dokunma anındaki his korunuyor — önce iyimser güncelleme, sonra tazeleme.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  // Sayfalama: uç 20'şer döndürüyor ve fazlası SESSİZCE kesiliyordu (36 kayıtlı
  // bir hesapta 16'sı hiç görünmüyordu). Liste zaten FlatList; eksik olan
  // sayfa isteğiydi.
  const query = useInfiniteQuery({
    queryKey: qk.notifications.list,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last, _all, lastPageParam) =>
      last.hasMore ? (lastPageParam as number) + 1 : undefined,
    // NOT: `maxPages` bilerek YOK (`useSearch` ile aynı gerekçe): `getPreviousPageParam` olmadan
    // ~100 bildirimden sonra 1. sayfa düşer, liste sıçrar ve sayaç (yalnız 1. sayfada) kaybolur.
    enabled: isAuthenticated,
    staleTime: LIST_STALE_MS,
  });

  const { refetch } = query;
  const pages = query.data?.pages ?? [];
  const data = {
    list: pages.flatMap((p) => p.list),
    // Rozet listenin TAMAMINA ait; ilk sayfanın sayacı otoritedir.
    unreadCount: pages[0]?.unreadCount ?? 0,
  };

  /**
   * Sorgu önbelleğini yerinde günceller — ağ beklemeden liste tepki verir.
   *
   * Önbellek artık SAYFALI: düzenleme her sayfaya uygulanır (işaretlenen satır
   * ikinci sayfada olabilir), ama sayaç yalnız ilk sayfada tutulur — rozet
   * oradan okunuyor, diğer sayfaların sayacı zaten kullanılmıyor.
   */
  const patchCache = useCallback(
    (fn: (prev: NotificationsPayload) => NotificationsPayload) => {
      queryClient.setQueryData<NotificationsPages>(qk.notifications.list, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p, i) => {
            const next = fn(p);
            return i === 0 ? next : { ...next, unreadCount: p.unreadCount };
          }),
        };
      });
    },
    [queryClient],
  );

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onMutate: (id) => {
      patchCache((prev) => ({
        ...prev,
        list: prev.list.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
      // Anasayfa rozeti ayrı sorgu — iyimser düşür (sunucu sayısı onSettled'da doğrulanır).
      queryClient.setQueryData<number>(qk.notifications.unread, (n) =>
        typeof n === 'number' ? Math.max(0, n - 1) : n,
      );
    },
    onError: () => {
      // Tek satır yazımı başarısız: iyimser düzenlemeyi geri almak için YALNIZ hatada liste tazelenir.
      queryClient.invalidateQueries({ queryKey: qk.notifications.list });
    },
    onSettled: () => {
      // Önbellek iyimser olarak zaten düzeltildi → listeyi (yüklü TÜM sayfaları) yeniden çekme.
      queryClient.invalidateQueries({ queryKey: qk.notifications.unread });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: () => {
      patchCache((prev) => ({
        ...prev,
        list: prev.list.map((n) => ({ ...n, read: true, isRead: true })),
        unreadCount: 0,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.list });
      queryClient.invalidateQueries({ queryKey: qk.notifications.unread });
    },
  });

  // Sekmeye dönüşte yalnız BAYATSA ve arka planda tazele (`stale: true`): taze veride istek yok,
  // ilk odaklanmada devam eden yükleme ikilenmez. Çekip-yenile göstergesi buna bağlı DEĞİL.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        queryClient.refetchQueries({ queryKey: qk.notifications.list, stale: true, type: 'active' });
      }
    }, [isAuthenticated, queryClient]),
  );

  // Gösterge yalnız KULLANICI çekip-yenilediğinde (Mesajlar ile aynı). `query.isRefetching`
  // arka plan tazelemelerinde (sekme odağı, okundu işaretleme, push) de true olur ve her
  // girişte spinner'ı görünür kılardı.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Yüklü TÜM sayfaları sırayla çekmek yerine ilk sayfaya kırp (tek istek).
      trimInfiniteToFirstPage(queryClient, qk.notifications.list);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, queryClient]);

  const handlePress = useCallback(
    (notification: Notification) => {
      if (!(notification.read || notification.isRead)) markAsRead.mutate(notification.id);

      // Hedef kararı TEK katmanda (tip istisnaları, `data` kimlikleri, link
      // eşlemesi ve güvenlik kapısı orada). Hedef yoksa gezinme YOK — satır
      // okundu işaretlenir, kullanıcı alakasız bir ekrana atılmaz.
      const target = routeForNotification(notification);
      // Bildirimler bir yığın ekranı: sekme hedefi (`/profile`, `/cart` …) alttaki `(tabs)`'a döner.
      if (target) navigateTo(target);
    },
    [markAsRead],
  );

  return {
    isAuthenticated,
    notifications: data.list,
    loading: query.isLoading,
    /** İlk sayfa alınamadı (liste boş) — "henüz bildirim yok" değil, ErrorState + yeniden dene. */
    loadFailed: query.isError && data.list.length === 0,
    retry: () => {
      void refetch();
    },
    refreshing,
    unreadCount: data.unreadCount,
    handleRefresh,
    handlePress,
    handleMarkAllAsRead: () => markAllAsRead.mutate(),
    /** Listenin sonuna gelindiğinde bir sonraki sayfayı ister. */
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    loadingMore: query.isFetchingNextPage,
  };
}

export type NotificationsController = ReturnType<typeof useNotifications>;
