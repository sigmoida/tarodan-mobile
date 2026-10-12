import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_SETTINGS, type NotificationSettings } from '../_lib/types';

/**
 * Notification-settings controller — owns the local settings state synced from
 * GET /users/me/settings, the PATCH save mutation, per-key toggle and focus
 * refetch. Lifted verbatim from the monolithic screen (§12).
 */
export function useNotificationSettings() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // Yükleme hatası YUTULMAZ: eskiden `.catch(() => null)` ile ekran
  // DEFAULT_SETTINGS gösteriyor, Kaydet de gerçek tercihlerin üzerine
  // varsayılanları yazıyordu. Artık hata → ErrorState + yeniden dene, ve
  // tercihler bir kez yüklenmeden kaydetme kapalı (`canSave`).
  const {
    data: settingsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: qk.user.notificationSettings,
    queryFn: async () => {
      const response = await api.get('/users/me/settings');
      return (response?.data ?? {}) as Partial<NotificationSettings>;
    },
    enabled: isAuthenticated,
  });
  const loaded = settingsData !== undefined;
  /** Hiç yüklenemedi (önbellekte veri yok) → ekran ErrorState gösterir. */
  const loadFailed = isError && !loaded;

  const { refreshing, onRefresh } = useRefresh(refetch);

  useEffect(() => {
    if (settingsData) {
      setSettings((prev) => ({ ...prev, ...settingsData }));
    }
  }, [settingsData]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated]),
  );

  // Anahtarlar PATCH /users/me/settings (UpdateNotificationSettingsDto) ile birebir;
  // backend bu tercihleri gönderim yollarında uygular (Bulgu #9 fix).
  // B-1.11: hata artık yutulmuyor — eskiden `.catch(() => null)` başarısız
  // kaydı başarı sayıp "kaydedildi" diyordu. Yerel seçimler korunur, kullanıcı
  // yeniden deneyebilir.
  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) =>
      api.patch('/users/me/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.notificationSettings });
      appAlert(t('common.success'), t('settings.notificationSettingsSaved'));
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      appAlert(
        t('common.error'),
        Array.isArray(msg) ? msg.join('\n') : msg || t('settings.settingUpdateFailed'),
      );
    },
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!loaded) return;
    saveMutation.mutate(settings);
  };

  return {
    isAuthenticated,
    settings,
    isLoading,
    loadFailed,
    canSave: loaded && !saveMutation.isPending,
    retryLoad: () => refetch(),
    refreshing,
    onRefresh,
    saveMutation,
    handleToggle,
    handleSave,
  };
}

export type NotificationSettingsController = ReturnType<typeof useNotificationSettings>;
