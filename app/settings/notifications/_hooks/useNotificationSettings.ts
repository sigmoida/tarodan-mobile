import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import { toast } from '@/ui';
import { useRefresh } from '@/hooks/useRefresh';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_SETTINGS, type NotificationSettings } from '../_lib/types';

const KEY = qk.user.notificationSettings;

type ToggleVars = { key: keyof NotificationSettings; value: boolean };

/**
 * Bildirim tercihleri — web `/profile` `NotificationsSection` ile aynı davranış: Kaydet düğmesi YOK,
 * her anahtar değiştiği anda TEK anahtarlık `PATCH /users/me/settings` gider (iyimser; önbellek
 * hemen güncellenir); kuyruk boşalınca TEK `toast.success` (her dokunuşta değil); hatada son onaylı
 * sunucu değerine geri alınır + hata toast'ı (tekilleşir) ve sunucu doğrusu yeniden çekilir.
 *
 * - Tek kaynak React Query önbelleği (`qk.user.notificationSettings`): ekran yerel kopya tutmaz, bu
 *   yüzden yeniden açılışta / yenilemede gösterilen her zaman sunucunun (ya da bekleyen iyimser
 *   yazmanın) değeridir.
 * - Yazmalar sıralı (`scope`): sunucu JSON'u oku-birleştir-yaz ile günceller; hızlı art arda iki
 *   anahtar paralel gitseydi biri diğerini ezebilirdi. Sunucu yanıtı (güncel tam nesne) yalnız
 *   kuyrukta başka yazma kalmadığında önbelleğe yazılır — sıradaki iyimser değer geri sıçramasın;
 *   kuyruk boşalınca sorgu bir kez geçersiz kılınır (sunucu doğrusu).
 * - Yükleme hatası yutulmaz: veri yoksa ErrorState + yeniden dene (varsayılanlar gösterilip
 *   gerçek tercihlerin üzerine yazılmaz).
 */
export function useNotificationSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NotificationSettings> => {
      const response = await api.get('/users/me/settings');
      return { ...DEFAULT_SETTINGS, ...((response?.data ?? {}) as Partial<NotificationSettings>) };
    },
    enabled: isAuthenticated,
  });
  /** Hiç yüklenemedi (önbellekte veri yok) → ekran ErrorState gösterir. */
  const loadFailed = isError && data === undefined;

  const { refreshing, onRefresh } = useRefresh(refetch);

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([KEY], isAuthenticated);

  // Kuyruk (ardışık dokunuşlar) boyunca ortak durum: son SUNUCU-ONAYLI değerler ve hata bayrağı.
  // Kuyruk boşalınca (`onSettled`, yalnız bu yazma kaldı) sıfırlanır.
  const batch = useRef<{ confirmed: NotificationSettings | null; failed: boolean }>({
    confirmed: null,
    failed: false,
  });
  /** Bu yazma hâlâ "pending" sayılır; 1 = kuyrukta yalnız bu var. */
  const isLastInQueue = () => queryClient.isMutating({ mutationKey: KEY }) <= 1;

  const updateMutation = useMutation({
    mutationKey: KEY,
    scope: { id: 'notification-settings' },
    mutationFn: async ({ key, value }: ToggleVars) => {
      const response = await api.patch('/users/me/settings', { [key]: value });
      return (response?.data ?? null) as Partial<NotificationSettings> | null;
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const current = queryClient.getQueryData<NotificationSettings>(KEY) ?? DEFAULT_SETTINGS;
      // Kuyruğun ilk yazması: o anki önbellek = son onaylı sunucu değeri.
      if (isLastInQueue()) batch.current = { confirmed: current, failed: false };
      queryClient.setQueryData<NotificationSettings>(KEY, { ...current, [key]: value });
    },
    onSuccess: async (saved) => {
      if (!saved) return;
      batch.current.confirmed = { ...(batch.current.confirmed ?? DEFAULT_SETTINGS), ...saved };
      if (isLastInQueue()) {
        // Arada başlamış bir yeniden çekme iyimser/yanıt değerinin üstüne yazmasın.
        await queryClient.cancelQueries({ queryKey: KEY });
        queryClient.setQueryData<NotificationSettings>(KEY, (old) => ({
          ...(old ?? DEFAULT_SETTINGS),
          ...saved,
        }));
      }
    },
    onError: (e, { key }) => {
      batch.current.failed = true;
      // Son ONAYLI sunucu değerine dön (aynı anahtarın kuyruktaki başka iyimser değerine değil).
      const confirmed = batch.current.confirmed;
      if (confirmed) {
        queryClient.setQueryData<NotificationSettings>(KEY, (old) => ({
          ...(old ?? confirmed),
          [key]: confirmed[key],
        }));
      }
      // Hatalar her zaman gösterilir; aynı kimlikle tekilleşir (art arda düşen yazmalar tek kart).
      toast.error(apiErrorMessage(e, t('settings.settingUpdateFailed')), {
        id: 'notification-settings-error',
      });
    },
    onSettled: () => {
      if (!isLastInQueue()) return;
      // Kuyruk boşaldı: sunucu doğrusunu bir kez çek; hatasız bittiyse TEK başarı toast'ı.
      void queryClient.invalidateQueries({ queryKey: KEY });
      if (!batch.current.failed) toast.success(t('settings.settingUpdated'));
      batch.current = { confirmed: null, failed: false };
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    if (!data) return;
    updateMutation.mutate({ key, value: !data[key] });
  };

  return {
    isAuthenticated,
    settings: data ?? DEFAULT_SETTINGS,
    isLoading,
    loadFailed,
    retryLoad: () => refetch(),
    refreshing,
    onRefresh,
    handleToggle,
  };
}

export type NotificationSettingsController = ReturnType<typeof useNotificationSettings>;
