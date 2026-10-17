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
 * hemen güncellenir), başarıda `toast.success`, hatada geri alınır + hata toast'ı.
 *
 * - Tek kaynak React Query önbelleği (`qk.user.notificationSettings`): ekran yerel kopya tutmaz, bu
 *   yüzden yeniden açılışta / yenilemede gösterilen her zaman sunucunun (ya da bekleyen iyimser
 *   yazmanın) değeridir.
 * - Yazmalar sıralı (`scope`): sunucu JSON'u oku-birleştir-yaz ile günceller; hızlı art arda iki
 *   anahtar paralel gitseydi biri diğerini ezebilirdi. Sunucu yanıtı (güncel tam nesne) yalnız
 *   kuyrukta başka yazma kalmadığında önbelleğe yazılır — sıradaki iyimser değer geri sıçramasın.
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

  const updateMutation = useMutation({
    mutationKey: KEY,
    scope: { id: 'notification-settings' },
    mutationFn: async ({ key, value }: ToggleVars) => {
      const response = await api.patch('/users/me/settings', { [key]: value });
      return (response?.data ?? null) as Partial<NotificationSettings> | null;
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const prev = queryClient.getQueryData<NotificationSettings>(KEY);
      queryClient.setQueryData<NotificationSettings>(KEY, (old) => ({
        ...(old ?? DEFAULT_SETTINGS),
        [key]: value,
      }));
      return { prev, key };
    },
    onSuccess: (saved) => {
      // Bu yazma hâlâ "pending" sayılır; 1 = kuyrukta yalnız bu var.
      if (saved && queryClient.isMutating({ mutationKey: KEY }) <= 1) {
        queryClient.setQueryData<NotificationSettings>(KEY, (old) => ({
          ...(old ?? DEFAULT_SETTINGS),
          ...saved,
        }));
      }
      toast.success(t('settings.settingUpdated'));
    },
    onError: (e, { key }, ctx) => {
      // Yalnız bu anahtarı geri al (aradaki diğer iyimser değişiklikler korunur).
      if (ctx?.prev) {
        const prevValue = ctx.prev[key];
        queryClient.setQueryData<NotificationSettings>(KEY, (old) => ({
          ...(old ?? ctx.prev!),
          [key]: prevValue,
        }));
      }
      toast.error(apiErrorMessage(e, t('settings.settingUpdateFailed')));
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
