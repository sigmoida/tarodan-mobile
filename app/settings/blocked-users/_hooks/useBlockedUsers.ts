import { useQuery } from '@tanstack/react-query';
import { userApi, type BlockedUser } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/**
 * Engellediğim kullanıcılar — `GET /users/me/blocked`. Engel kaldırma
 * mutation'ı paylaşılan `useBlockUser`'da; bu hook yalnız okur.
 */
export function useBlockedUsers() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: qk.blocks.list,
    enabled: isAuthenticated,
    queryFn: async (): Promise<BlockedUser[]> => {
      const response = await userApi.getBlockedUsers();
      const payload = (response.data as { data?: unknown } | undefined)?.data ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
  });

  return {
    isAuthenticated,
    blocked: query.data ?? [],
    isLoading: isAuthenticated && query.isLoading,
    /** The list never loaded (a failed background refetch keeps the cached list). */
    loadFailed: query.isError && query.data === undefined,
    refetch: query.refetch,
  };
}
