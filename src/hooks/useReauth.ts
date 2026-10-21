import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, runAfterModalClose } from '@/ui';
import { authApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import {
  isReauthRequired,
  isServerOrNetworkFailure,
  isSessionEndedError,
} from '@/lib/api/reauthError';
import { confirmableProviders, getVisibleSocialProviders } from '@/components/auth/socialProviders';
import type { ReauthPrompt } from '@/components/auth/ReauthModal';
import { signInWithGoogle } from '@/services/googleSignin';
import { isGoogleCancel } from '@/services/googleSigninErrors';
import { signInWithApple } from '@/services/appleSignin';
import { captureException } from '@/services/sentry';
import { useAuthStore } from '@/stores/authStore';
import type { ReauthRequest, SignInProvider } from '@/types/sign-in-methods';
import { useAppleAvailability } from './useAppleAvailability';
import { useLatestRef } from './useLatestRef';
import { useSendSetPasswordMail } from './useSendSetPasswordMail';
import { signInMethodsQuery } from './useSignInMethods';

/** Which sensitive action asked for the step-up (Sentry tag, the API's `auth.flow` names). */
export type ReauthFlow = 'password_set' | 'account_delete' | 'email_change';

export type ReauthOutcome<T> =
  | { status: 'done'; value: T }
  /** The user closed the confirm step, or the session ended meanwhile. Show nothing. */
  | { status: 'cancelled' }
  /** No password and no linked provider this device can show (Android, ADR 0012). */
  | { status: 'unavailable' };

type Obtained = { kind: 'token'; token: string } | { kind: 'cancelled' } | { kind: 'unavailable' };

const CANCELLED = { status: 'cancelled' } as const;
const UNAVAILABLE = { status: 'unavailable' } as const;

/** Apple's own cancel code (`expo-apple-authentication`). */
const APPLE_CANCELLED = 'ERR_REQUEST_CANCELED';

export interface RunOptions {
  /**
   * Run the action without a token when this device cannot confirm. Only for the
   * setting-gated routes (account deletion, e-mail change): they still accept no token while
   * `auth_require_reauth_for_sensitive_actions` is off, and must never be blocked on a device
   * that has no way to confirm (store account-deletion rules).
   */
  allowUnconfirmed?: boolean;
}

/**
 * The "Confirm it's you" step (`POST /auth/reauth`, contract delta 2026-10-21), mobile twin of
 * web `useReauth`. The screen renders `<ReauthModal {...reauth.modal} />` and wraps each
 * sensitive call in `reauth.run(token => api(...))`:
 *
 * - The proof is the password when the account has one; otherwise a fresh sign-in of a linked
 *   provider this device shows (`confirmableProviders`). Google signs the SDK out first, so the
 *   chooser shows and the `idToken` is new (`iat` at most 300 s old); only `idToken` is sent.
 * - The token lives in this hook only (a ref): never persisted, never in a store, gone when the
 *   screen unmounts. It is reused for later writes on the same screen; on
 *   `403 REAUTH_REQUIRED` it is dropped, the confirm step opens once more and the action is
 *   retried once.
 * - iOS modal rule: the modal closes before the proof is sent; a native provider sheet opens
 *   only after it has closed. A failed proof (`403 REAUTH_FAILED`, `429 REAUTH_LOCKED`,
 *   `503 REAUTH_UNAVAILABLE`, network) reopens the modal with the server's message. None of
 *   these is a 401, so the client never refreshes or signs out on them.
 * - Sentry: only 5xx and network failures, tagged with the flow and method, no PII.
 */
export function useReauth(flow: ReauthFlow) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const appleAvailable = useLatestRef(useAppleAvailability());
  const email = useAuthStore((s) => s.user?.email ?? null);
  const sendMail = useSendSetPasswordMail();
  const proofMutation = useMutation({
    mutationFn: (proof: ReauthRequest) => authApi.reauth(proof),
    // The answer carries the token: keep it out of the mutation cache once the screen is gone.
    gcTime: 0,
  });

  const tokenRef = useRef<string | null>(null);
  const resolverRef = useRef<((result: Obtained) => void) | null>(null);
  const lastPromptRef = useRef<ReauthPrompt | null>(null);
  const [prompt, setPrompt] = useState<ReauthPrompt | null>(null);
  const [pending, setPending] = useState(false);

  const finish = useCallback((result: Obtained) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    lastPromptRef.current = null;
    setPending(false);
    resolve?.(result);
  }, []);

  // An unmounted screen never resumes its action; the token dies with it.
  useEffect(
    () => () => {
      tokenRef.current = null;
      resolverRef.current?.({ kind: 'cancelled' });
      resolverRef.current = null;
    },
    [],
  );

  const open = useCallback((next: ReauthPrompt) => {
    resolverRef.current?.({ kind: 'cancelled' });
    lastPromptRef.current = next;
    setPrompt(next);
    return new Promise<Obtained>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  /** Back to the confirm step (wrong proof, native sheet closed) once the last layer has closed. */
  const reopen = useCallback((error: string | null) => {
    setPending(false);
    const last = lastPromptRef.current;
    if (!last || !resolverRef.current) return;
    runAfterModalClose(() => {
      if (resolverRef.current) setPrompt({ ...last, error });
    });
  }, []);

  const obtain = useCallback(
    async (refresh: boolean): Promise<Obtained> => {
      if (tokenRef.current) return { kind: 'token', token: tokenRef.current };
      let methods;
      try {
        methods = refresh
          ? await queryClient.fetchQuery({ ...signInMethodsQuery, staleTime: 0 })
          : await queryClient.ensureQueryData(signInMethodsQuery);
      } catch (error) {
        return isSessionEndedError(error) ? { kind: 'cancelled' } : { kind: 'unavailable' };
      }
      if (methods?.hasPassword) return open({ variant: 'password', providers: [], error: null });
      const visible = getVisibleSocialProviders({ appleAvailable: appleAvailable.current });
      const providers = confirmableProviders(methods ?? { providers: [] }, visible);
      if (providers.length === 0) return { kind: 'unavailable' };
      return open({ variant: 'provider', providers, error: null });
    },
    [appleAvailable, open, queryClient],
  );

  const confirm = useCallback(
    async (proof: ReauthRequest, method: 'password' | SignInProvider) => {
      setPending(true);
      try {
        const { data } = await proofMutation.mutateAsync(proof);
        if (!data?.reauthToken) throw new Error('Step-up answer without a token');
        tokenRef.current = data.reauthToken;
        finish({ kind: 'token', token: data.reauthToken });
      } catch (error) {
        if (isSessionEndedError(error)) {
          finish({ kind: 'cancelled' });
          return;
        }
        if (isServerOrNetworkFailure(error)) {
          captureException(error, { level: 'error', tags: { flow: 'auth.reauth', reauthFor: flow, method } });
        }
        reopen(apiErrorMessage(error, t('error.somethingWrongDesc')));
      }
    },
    [finish, flow, proofMutation, reopen, t],
  );

  const onCancel = useCallback(() => {
    setPrompt(null);
    finish({ kind: 'cancelled' });
  }, [finish]);

  const onSubmitPassword = useCallback(
    (password: string) => {
      setPrompt(null);
      void confirm({ password }, 'password');
    },
    [confirm],
  );

  const onProvider = useCallback(
    (provider: SignInProvider) => {
      setPrompt(null);
      setPending(true);
      runAfterModalClose(async () => {
        let proof: ReauthRequest;
        try {
          proof =
            provider === 'google'
              ? { provider: 'google', idToken: await signInWithGoogle({ fresh: true }) }
              : { provider: 'apple', identityToken: (await signInWithApple()).identityToken };
        } catch (error) {
          const code = (error as { code?: unknown } | null)?.code;
          const cancelled = provider === 'google' ? isGoogleCancel(error) : code === APPLE_CANCELLED;
          reopen(cancelled ? null : apiErrorMessage(error, t('error.somethingWrongDesc')));
          return;
        }
        await confirm(proof, provider);
      });
    },
    [confirm, reopen, t],
  );

  const sendSetPasswordMail = useCallback(() => {
    if (email) sendMail.mutate(email);
  }, [email, sendMail]);

  /** The account cannot confirm on this device and the server now requires it. */
  const explainUnavailable = useCallback(() => {
    appAlert(t('auth.reauth.title'), t('mobile.noPasswordAccountNoProvider'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.setPassword'), onPress: sendSetPasswordMail },
    ]);
  }, [sendSetPasswordMail, t]);

  /**
   * Run a sensitive call with a step-up token. Errors of the call itself are thrown to the
   * caller (after the one `REAUTH_REQUIRED` retry); the confirm step's own errors stay inside it.
   */
  const run = useCallback(
    async <T,>(
      action: (reauthToken: string | undefined) => Promise<T>,
      { allowUnconfirmed = false }: RunOptions = {},
    ): Promise<ReauthOutcome<T>> => {
      const first = await obtain(false);
      if (first.kind === 'cancelled') return CANCELLED;
      if (first.kind === 'unavailable' && !allowUnconfirmed) return UNAVAILABLE;
      try {
        return { status: 'done', value: await action(first.kind === 'token' ? first.token : undefined) };
      } catch (error) {
        if (!isReauthRequired(error)) throw error;
        tokenRef.current = null;
        const again = await obtain(true);
        if (again.kind === 'cancelled') return CANCELLED;
        if (again.kind === 'unavailable') {
          if (!allowUnconfirmed) return UNAVAILABLE;
          explainUnavailable();
          return CANCELLED;
        }
        return { status: 'done', value: await action(again.token) };
      }
    },
    [explainUnavailable, obtain],
  );

  return {
    run,
    /** The proof is on its way (modal closed, native sheet or request in flight). */
    pending,
    sendSetPasswordMail,
    sendingMail: sendMail.isPending,
    modal: { prompt, onCancel, onSubmitPassword, onProvider },
  };
}

export type ReauthController = ReturnType<typeof useReauth>;
