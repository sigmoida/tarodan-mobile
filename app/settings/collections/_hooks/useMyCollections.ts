import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { toast } from '@/ui';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useRefresh } from '@/hooks/useRefresh';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/** Yükseltme ekranına yönlendirmeden önce bilgi mesajının görünme süresi (ms). */
const UPGRADE_REDIRECT_DELAY_MS = 1500;

/**
 * Koleksiyonlarım (ayarlar) controller'ı — `/collections/me` sorgusu, çekip yenileme ve
 * "yeni koleksiyon" kapısı (premium değilse bilgi toast'ı; iOS'ta yükseltme yönlendirmesi yok).
 */
export function useMyCollections() {
  const { t } = useTranslation();
  const { limits, isAuthenticated } = useAuthStore();
  const canCreateCollections = limits?.canCreateCollections || false;

  const query = useQuery({
    queryKey: qk.collections.mine,
    // Hata yutulmaz: önbelleğe `[]` yazmak "koleksiyon yok" gösteriyordu (anahtar paylaşımlı);
    // fırlatılır → ekran ErrorState + yeniden dene.
    queryFn: async () => {
      const response = await api.get('/collections/me');
      // API şekli: { collections, total, page, pageSize }
      return (
        response.data?.collections ??
        response.data?.data ??
        (Array.isArray(response.data) ? response.data : [])
      );
    },
    enabled: isAuthenticated,
  });

  const { refreshing, onRefresh } = useRefresh(query.refetch);
  const collections: any[] = Array.isArray(query.data) ? query.data : [];

  const handleCreateCollection = () => {
    if (!canCreateCollections) {
      toast(
        CAN_BUY_DIGITAL
          ? t('collection.premiumRequiredMsg')
          : t('membership.featureUnavailableOnAccount'),
      );
      // iOS'ta yükseltme ekranına yönlendirme yok (Guideline 3.1.3).
      if (CAN_BUY_DIGITAL) setTimeout(() => router.push('/upgrade'), UPGRADE_REDIRECT_DELAY_MS);
      return;
    }
    router.push('/collections/new');
  };

  return {
    t,
    isAuthenticated,
    canCreateCollections,
    collections,
    isLoading: query.isLoading,
    loadFailed: query.isError && !query.data,
    retry: () => {
      void query.refetch();
    },
    refreshing,
    onRefresh,
    handleCreateCollection,
  };
}

export type MyCollectionsController = ReturnType<typeof useMyCollections>;
