import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { useWriteSignInMethods } from '@/hooks/useSignInMethods';
import type { SetPasswordRequest, SignInMethods } from '@/types/sign-in-methods';

/**
 * `POST /auth/password/set` (always behind the step-up). The answer is the fresh
 * `SignInMethods`, written to `qk.auth.signInMethods` so the security hub switches to
 * "Change password" without a reload. Feedback lives in `useSetPasswordFlow`.
 */
export function useDoSetPassword() {
  const writeMethods = useWriteSignInMethods();
  return useAppMutation(
    async (body: SetPasswordRequest): Promise<SignInMethods> => (await authApi.setPassword(body)).data,
    {
      silentError: true,
      onSuccess: (methods) => writeMethods(methods),
      // The variables hold the new password and the step-up token: no cache entry after use.
      mutation: { gcTime: 0 },
    },
  );
}
