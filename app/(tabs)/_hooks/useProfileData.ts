import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Profile data controller — owns the membership query, derived tier values, and pull-to-refresh.
 * Güven skoru / görünürlük anahtarı profil başlığından kalktı → `useTrustVisibility` (Profili Düzenle). Sayaç/koleksiyon
 * sorguları kaldırıldı: profil artık web `ProfileSidebar` gibi sayısız, gruplu bir menü.
 */
export function useProfileData() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // BUG-008: Efektif üyelik tier'ı — backend /membership/me past_due'yu free'ye
  // indirir (web ile parite). user.membershipTier bayat kalabilir; rozet/ikon
  // bunun yerine API'nin döndürdüğü efektif tier'ı kullanmalı.
  const { data: membershipData } = useQuery({
    queryKey: ['membership-me'],
    queryFn: async () => {
      try {
        const response = await membershipApi.getCurrentMembership();
        const body = response.data?.data ?? response.data ?? {};
        return (body?.tier?.type ?? body?.tierType ?? null) as string | null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: 1,
  });
  const effectiveTier: string = membershipData ?? user?.membershipTier ?? 'free';
  const isPaidTier = effectiveTier === 'premium' || effectiveTier === 'business';

  // Aşağı çekince üyelik tier'ını tazele.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['membership-me'] });
    } finally {
      setRefreshing(false);
    }
  };

  return {
    isAuthenticated,
    user,
    effectiveTier,
    isPaidTier,
    refreshing,
    onRefresh,
  };
}
