/**
 * Secrets in the React Query caches (in tests): a step-up token or a password sent through a
 * mutation must be gone once its screen is. Usage, after the flow under test has run:
 *   await expectCachesFreeOf(queryClient, unmount, ['tok-1', 'Secret123']);
 * The mutations that carry them use `gcTime: 0`; the test client keeps finished mutations for
 * TanStack's default 5 minutes, so a missing `gcTime: 0` fails here. (Mutations are never
 * written to the persisted cache: `src/lib/query/__tests__/persist.test.ts`.)
 */
import { act } from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';

export async function expectCachesFreeOf(
  queryClient: QueryClient,
  unmount: () => void,
  secrets: readonly string[],
): Promise<void> {
  unmount();
  // An unobserved `gcTime: 0` mutation is removed on the next timer tick.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  const mutations = JSON.stringify(queryClient.getMutationCache().getAll().map((m) => m.state));
  const queries = JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.state));
  for (const secret of secrets) {
    expect(mutations).not.toContain(secret);
    expect(queries).not.toContain(secret);
  }
}
