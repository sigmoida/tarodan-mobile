import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, membershipApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Profile data controller — owns the profile queries (trust, membership), the
 * trust-visibility mutation, derived values, and pull-to-refresh. Sayaç/koleksiyon
 * sorguları kaldırıldı: profil artık web `ProfileSidebar` gibi sayısız, gruplu bir menü.
 */
export function useProfileData() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Güven skoru + görünürlük: sahibin kendi /users/me yanıtından (web profil sayfası paritesi).
  // getPublicProfile sahibe de görünürlük kuralını uygular (gizliyken trustScore=null) → toggle kaybolurdu;
  // owner endpoint'i skoru her zaman döndüğü için toggle her durumda görünür kalır.
  const { data: meProfile } = useQuery({
    queryKey: ['me-trust', user?.id],
    queryFn: async () => {
      const response = await userApi.getProfile();
      return (response.data as any)?.data ?? (response.data as any) ?? null;
    },
    enabled: isAuthenticated && !!user?.id,
  });
  const isPremiumProfile: boolean = !!(meProfile as any)?.isPremium;
  const trustScore: number | null =
    typeof (meProfile as any)?.trustScore === 'number' ? (meProfile as any).trustScore : null;
  const trustLevel: string | null = (meProfile as any)?.trustLevel ?? null;
  const showTrustScore: boolean = (meProfile as any)?.showTrustScore !== false;

  // Güven skorunun herkese açık görünürlüğünü değiştir (web `toggleTrustVisibility` paritesi).
  const trustVisibilityMutation = useMutation({
    mutationFn: (next: boolean) => userApi.updateProfile({ showTrustScore: next }),
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: ['me-trust', user?.id] });
      const prev = queryClient.getQueryData(['me-trust', user?.id]);
      queryClient.setQueryData(['me-trust', user?.id], (old: any) =>
        old ? { ...old, showTrustScore: next } : old,
      );
      return { prev };
    },
    onError: (_err, _next, context: any) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['me-trust', user?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me-trust', user?.id] });
    },
  });

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
  const tierLabel = effectiveTier === 'business' ? 'Business' : 'Premium';

  // Aşağı çekince güven skoru ve üyelik tier'ını tazele.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['me-trust', user?.id] }),
        queryClient.refetchQueries({ queryKey: ['membership-me'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    isAuthenticated,
    user,
    isPremiumProfile,
    trustScore,
    trustLevel,
    showTrustScore,
    trustVisibilityMutation,
    effectiveTier,
    isPaidTier,
    tierLabel,
    refreshing,
    onRefresh,
  };
}
