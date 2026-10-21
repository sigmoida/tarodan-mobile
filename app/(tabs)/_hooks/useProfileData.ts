import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMembershipTier } from '@/hooks/useMembershipTier';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/**
 * Profile data controller — owns the membership query, derived tier values, and pull-to-refresh.
 * The trust score no longer shows in the profile header. Counter/collection queries were removed:
 * the profile is now a counter-free grouped menu like web `ProfileSidebar`.
 */
export function useProfileData() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Efektif üyelik katmanı tek kaynaktan (Ayarlar ekranı da aynı hook'u kullanır).
  const { effectiveTier, isPaidTier } = useMembershipTier();

  // Aşağı çekince üyelik tier'ını tazele.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: qk.membership.me });
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
