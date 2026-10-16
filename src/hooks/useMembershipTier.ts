import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/**
 * Efektif üyelik katmanı — TEK kaynak (Profil sekmesi + Ayarlar ekranı menü bağlamı).
 * BUG-008: backend /membership/me past_due'yu free'ye indirir (web ile parite); `user.membershipTier`
 * bayat kalabilir, bu yüzden API'nin döndürdüğü efektif katman önceliklidir.
 */
export function useMembershipTier() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { data: membershipData } = useQuery({
    queryKey: qk.membership.me,
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
  return { effectiveTier, isPaidTier };
}
