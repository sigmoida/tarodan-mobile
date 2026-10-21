import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import type { SignInMethods } from '@/types/sign-in-methods';

/** Query options shared by the hook and by imperative reads (`useReauth`). */
export const signInMethodsQuery = {
  queryKey: qk.auth.signInMethods,
  queryFn: async (): Promise<SignInMethods> => (await authApi.getSignInMethods()).data,
} as const;

/**
 * The signed-in account's sign-in methods (`GET /auth/sign-in-methods`): whether it has a
 * password and which providers are linked. Server state only: never persisted (not in the
 * `persist.ts` allow-list), cleared with the query cache on sign-out.
 */
export function useSignInMethods() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const query = useQuery({ ...signInMethodsQuery, enabled: isAuthenticated });
  return {
    methods: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Store the `SignInMethods` a write answered (no second GET), then let the query refresh. */
export function writeSignInMethods(queryClient: QueryClient, methods: SignInMethods | undefined): void {
  if (methods && typeof methods.hasPassword === 'boolean') {
    queryClient.setQueryData(qk.auth.signInMethods, methods);
  }
  void queryClient.invalidateQueries({ queryKey: qk.auth.signInMethods });
}

export function useWriteSignInMethods() {
  const queryClient = useQueryClient();
  return useCallback(
    (methods: SignInMethods | undefined) => writeSignInMethods(queryClient, methods),
    [queryClient],
  );
}
