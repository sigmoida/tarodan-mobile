import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { useWriteSignInMethods } from '@/hooks/useSignInMethods';
import type { ProviderCredential } from '@/components/auth/providerCredential';
import type { SignInMethods } from '@/types/sign-in-methods';

export interface LinkProviderVars {
  credential: ProviderCredential;
  reauthToken: string;
}

/**
 * Connect Google or Apple (`POST /auth/social/{google|apple}/link`, always behind the step-up).
 * Google sends the native `idToken`; Apple sends `identityToken` and `authorizationCode` (so the
 * API can revoke it later). The answer is the fresh `SignInMethods`, written to
 * `qk.auth.signInMethods` (no second GET). Feedback lives in `useConnectedAccounts`.
 */
export function useDoLinkProvider() {
  const writeMethods = useWriteSignInMethods();
  return useAppMutation(
    async ({ credential, reauthToken }: LinkProviderVars): Promise<SignInMethods> => {
      const res =
        credential.provider === 'google'
          ? await authApi.linkGoogle({ idToken: credential.idToken, reauthToken })
          : await authApi.linkApple({
              identityToken: credential.identityToken,
              authorizationCode: credential.authorizationCode,
              reauthToken,
            });
      return res.data;
    },
    {
      silentError: true,
      onSuccess: (methods) => writeMethods(methods),
      // The variables hold the provider token and the step-up token: no cache entry after use.
      mutation: { gcTime: 0 },
    },
  );
}
