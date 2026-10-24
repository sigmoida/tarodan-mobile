import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { useWriteSignInMethods } from '@/hooks/useSignInMethods';
import type { SignInMethods, SignInProvider } from '@/types/sign-in-methods';

export interface UnlinkProviderVars {
  provider: SignInProvider;
  reauthToken: string;
}

/**
 * Disconnect a provider (`POST /auth/social/:provider/unlink`, always behind the step-up). The
 * answer is the fresh `SignInMethods`, written to `qk.auth.signInMethods`. Feedback lives in
 * `useConnectedAccounts`.
 */
export function useDoUnlinkProvider() {
  const writeMethods = useWriteSignInMethods();
  return useAppMutation(
    async ({ provider, reauthToken }: UnlinkProviderVars): Promise<SignInMethods> =>
      (await authApi.unlinkProvider(provider, { reauthToken })).data,
    {
      silentError: true,
      onSuccess: (methods) => writeMethods(methods),
      // The variables hold the step-up token: no cache entry after use.
      mutation: { gcTime: 0 },
    },
  );
}
