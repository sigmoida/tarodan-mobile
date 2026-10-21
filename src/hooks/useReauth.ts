import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, MODAL_CLOSE_DELAY_MS, runAfterModalClose } from '@/ui';
import { authApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import {
  isReauthRequired,
  isServerOrNetworkFailure,
  isSessionEndedError,
  signInMethodsErrorCode,
} from '@/lib/api/reauthError';
import { isNotFoundError } from '@/lib/query/errors';
import { confirmableProviders, visibleSocialProvidersNow } from '@/components/auth/socialProviders';
import type { ReauthPrompt } from '@/components/auth/ReauthModal';
import { signInWithGoogle } from '@/services/googleSignin';
import { isGoogleCancel, isGoogleDeveloperError } from '@/services/googleSigninErrors';
import { signInWithApple } from '@/services/appleSignin';
import { isAppleCancel } from '@/services/appleSigninErrors';
import { captureException } from '@/services/sentry';
import {
  SIGN_IN_METHODS_ERROR_CODES,
  type ReauthRequest,
  type SignInProvider,
} from '@/types/sign-in-methods';
import { useSendSetPasswordMailToSelf } from './useSendSetPasswordMail';
import { signInMethodsQuery } from './useSignInMethods';
import type { SignInMethods } from '@/types/sign-in-methods';

/** Which sensitive action asked for the step-up (Sentry tag, the API's `auth.flow` names). */
export type ReauthFlow = 'password_set' | 'account_delete' | 'email_change';

export type ReauthOutcome<T> =
  | { status: 'done'; value: T }
  /** The user closed the confirm step, or the session ended meanwhile. Show nothing. */
  | { status: 'cancelled' }
  /** No password and no linked provider this device can show (Android, ADR 0012). */
  | { status: 'unavailable' };

/**
 * A cached token is reused only while it has this much life left by the device clock (web
 * `REAUTH_EXPIRY_MARGIN_MS`). `expiresAt` is server time; a skewed clock is covered by the one
 * retry on `403 REAUTH_REQUIRED`.
 */
export const REAUTH_EXPIRY_MARGIN_MS = 15_000;

type Obtained = { kind: 'token'; token: string } | { kind: 'cancelled' } | { kind: 'unavailable' };
type Evaluated = { prompt: ReauthPrompt } | { done: Obtained };

const CANCELLED = { status: 'cancelled' } as const;
const UNAVAILABLE = { status: 'unavailable' } as const;

/**
 * The "Confirm it's you" step (`POST /auth/reauth`, contract delta 2026-10-21), mobile twin of
 * web `useReauth`. The screen renders `<ReauthModal {...reauth.modal} />` and wraps each
 * sensitive call in `reauth.run(token => api(...))` (or `runGated` for the setting-gated routes).
 *
 * - The proof is the password when the account has one; otherwise a fresh sign-in of a linked
 *   provider this device shows (`confirmableProviders`). Google signs the SDK out first, so the
 *   chooser shows and the `idToken` is new (`iat` at most 300 s old); only `idToken` is sent.
 *   If the sign-in methods cannot be read, the step shows the error and a retry (a missing route,
 *   404, means an API before the step-up: `unavailable`).
 * - The token lives in this hook only (a ref): never persisted, never in a store, gone when the
 *   screen unmounts. It is reused until 15 s before `expiresAt`; on `403 REAUTH_REQUIRED` it is
 *   dropped, the step opens once more and the action is retried once. Two calls asking at once
 *   share one step. A proof that lands after a cancel or unmount is never kept.
 * - iOS modal rule: the modal closes before the proof is sent; a native provider sheet opens
 *   only after it has closed. A failed proof (`403 REAUTH_FAILED`, `429 REAUTH_LOCKED`,
 *   `503 REAUTH_UNAVAILABLE`, network) reopens the modal with the server's message;
 *   `400 REAUTH_METHOD_NOT_ALLOWED` (the account got a password elsewhere) re-reads the methods
 *   and asks for the password. None of these is a 401, so the client never refreshes or signs out
 *   on them. A cancel is silent (no toast, no Sentry).
 * - Sentry: only 5xx and network failures (and the Google DEVELOPER_ERROR), tagged with the flow
 *   and method, no PII.
 */
export function useReauth(flow: ReauthFlow) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mail = useSendSetPasswordMailToSelf();
  const { mutateAsync: sendProof } = useMutation({
    mutationFn: (proof: ReauthRequest) => authApi.reauth(proof),
    // The answer carries the token: keep it out of the mutation cache once the screen is gone.
    gcTime: 0,
  });

  const tokenRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const pendingRef = useRef<{ promise: Promise<Obtained>; resolve: (r: Obtained) => void } | null>(null);
  const lastPromptRef = useRef<ReauthPrompt | null>(null);
  const [prompt, setPromptState] = useState<ReauthPrompt | null>(null);
  const [pending, setPending] = useState(false);
  const mountedRef = useRef(true);
  const closedAtRef = useRef(0);

  /** Every close is stamped: a reopen within the close animation waits for it (iOS modal rule). */
  const setPrompt = useCallback((next: ReauthPrompt | null) => {
    if (next === null) closedAtRef.current = Date.now();
    setPromptState(next);
  }, []);

  const liveToken = useCallback((): string | null => {
    const cached = tokenRef.current;
    if (cached && Date.now() < cached.expiresAt - REAUTH_EXPIRY_MARGIN_MS) return cached.token;
    tokenRef.current = null;
    return null;
  }, []);

  const finish = useCallback((result: Obtained) => {
    const waiting = pendingRef.current;
    pendingRef.current = null;
    lastPromptRef.current = null;
    setPending(false);
    waiting?.resolve(result);
  }, []);

  // An unmounted screen never resumes its action; the token dies with it.
  useEffect(
    () => () => {
      mountedRef.current = false;
      tokenRef.current = null;
      pendingRef.current?.resolve({ kind: 'cancelled' });
      pendingRef.current = null;
    },
    [],
  );

  /** Open the step, or join the one already waiting. */
  const open = useCallback((next: ReauthPrompt): Promise<Obtained> => {
    if (pendingRef.current) return pendingRef.current.promise;
    let resolve!: (r: Obtained) => void;
    const promise = new Promise<Obtained>((res) => {
      resolve = res;
    });
    pendingRef.current = { promise, resolve };
    lastPromptRef.current = next;
    // A reopen right after a close (the REAUTH_REQUIRED retry) waits for the close animation.
    if (Date.now() - closedAtRef.current < MODAL_CLOSE_DELAY_MS) {
      runAfterModalClose(() => {
        if (pendingRef.current?.promise === promise) setPrompt(next);
      });
    } else {
      setPrompt(next);
    }
    return promise;
  }, [setPrompt]);

  /** Back to the step (wrong proof, sheet closed, retry) once the last layer has closed. */
  const show = useCallback((next: ReauthPrompt) => {
    setPending(false);
    lastPromptRef.current = next;
    runAfterModalClose(() => {
      if (pendingRef.current) setPrompt(next);
    });
  }, [setPrompt]);

  const showLast = useCallback(
    (error: string | null) => {
      const last = lastPromptRef.current;
      if (last) show({ ...last, error });
    },
    [show],
  );

  /** Which proof to ask for, from the sign-in methods (re-read when `refresh`). */
  const evaluate = useCallback(
    async (refresh: boolean): Promise<Evaluated> => {
      let methods: SignInMethods | undefined;
      try {
        methods = refresh
          ? await queryClient.fetchQuery({ ...signInMethodsQuery, staleTime: 0 })
          : await queryClient.ensureQueryData(signInMethodsQuery);
      } catch (error) {
        if (isSessionEndedError(error)) return { done: { kind: 'cancelled' } };
        // No such route: an API before the step-up, which needs no token.
        if (isNotFoundError(error)) return { done: { kind: 'unavailable' } };
        // A failed re-read keeps the methods already known (web: only a failed first load shows
        // the error).
        methods = queryClient.getQueryData<SignInMethods>(signInMethodsQuery.queryKey);
        if (!methods) {
          if (isServerOrNetworkFailure(error)) {
            captureException(error, { level: 'error', tags: { flow: 'auth.reauth', reauthFor: flow, step: 'methods' } });
          }
          return {
            prompt: { variant: 'loadError', providers: [], error: apiErrorMessage(error, t('error.somethingWrongDesc')) },
          };
        }
      }
      if (methods?.hasPassword) return { prompt: { variant: 'password', providers: [], error: null } };
      const providers = confirmableProviders(methods ?? { providers: [] }, await visibleSocialProvidersNow());
      if (providers.length === 0) return { done: { kind: 'unavailable' } };
      return { prompt: { variant: 'provider', providers, error: null } };
    },
    [flow, queryClient, t],
  );

  const obtain = useCallback(
    async (refresh: boolean): Promise<Obtained> => {
      const live = liveToken();
      if (live) return { kind: 'token', token: live };
      if (pendingRef.current) return pendingRef.current.promise;
      const next = await evaluate(refresh);
      // While this call read the methods, the screen may have gone, or another call may have
      // confirmed (use its token) or opened the step (join it).
      if (!mountedRef.current) return { kind: 'cancelled' };
      const confirmed = liveToken();
      if (confirmed) return { kind: 'token', token: confirmed };
      // Re-read the ref: TypeScript keeps the narrowing from before the await.
      const waiting = pendingRef.current as { promise: Promise<Obtained> } | null;
      if (waiting) return waiting.promise;
      return 'done' in next ? next.done : open(next.prompt);
    },
    [evaluate, liveToken, open],
  );

  const confirm = useCallback(
    async (proof: ReauthRequest, method: 'password' | SignInProvider) => {
      setPending(true);
      let data;
      try {
        data = (await sendProof(proof)).data;
      } catch (error) {
        if (isSessionEndedError(error)) {
          finish({ kind: 'cancelled' });
          return;
        }
        if (isServerOrNetworkFailure(error)) {
          captureException(error, { level: 'error', tags: { flow: 'auth.reauth', reauthFor: flow, method } });
        }
        const message = apiErrorMessage(error, t('error.somethingWrongDesc'));
        if (signInMethodsErrorCode(error) === SIGN_IN_METHODS_ERROR_CODES.reauthMethodNotAllowed) {
          const next = await evaluate(true);
          if (!pendingRef.current) return;
          if ('done' in next) finish(next.done);
          // A load error keeps its own message (the retry is about it).
          else show(next.prompt.variant === 'loadError' ? next.prompt : { ...next.prompt, error: message });
          return;
        }
        showLast(message);
        return;
      }
      // Nobody waits any more (cancelled, screen left): a step-up the user dropped is never kept.
      if (!pendingRef.current) return;
      if (!data?.reauthToken) {
        showLast(t('error.somethingWrongDesc'));
        return;
      }
      const expiresAt = Date.parse(data.expiresAt);
      // An unreadable expiry is used for this request only, never cached.
      tokenRef.current = Number.isFinite(expiresAt) ? { token: data.reauthToken, expiresAt } : null;
      finish({ kind: 'token', token: data.reauthToken });
    },
    [evaluate, finish, flow, sendProof, show, showLast, t],
  );

  const onCancel = useCallback(() => {
    setPrompt(null);
    finish({ kind: 'cancelled' });
  }, [finish, setPrompt]);

  const onSubmitPassword = useCallback(
    (password: string) => {
      setPrompt(null);
      void confirm({ password }, 'password');
    },
    [confirm, setPrompt],
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
          if (provider === 'google' ? isGoogleCancel(error) : isAppleCancel(error)) {
            showLast(null);
            return;
          }
          // A build fault (Android OAuth client / SHA-1): plain copy instead of the native text,
          // and reported, as on the login screen. The login copy ("sign in with your e-mail")
          // does not fit a signed-in user, so the generic Google failure line is shown.
          if (provider === 'google' && isGoogleDeveloperError(error)) {
            captureException(error, {
              level: 'error',
              tags: { flow: 'auth.reauth', reauthFor: flow, method: provider, reason: 'developer_error' },
            });
            showLast(t('auth.googleSignInFailed'));
            return;
          }
          showLast(apiErrorMessage(error, t('error.somethingWrongDesc')));
          return;
        }
        await confirm(proof, provider);
      });
    },
    [confirm, flow, setPrompt, showLast, t],
  );

  const onRetry = useCallback(() => {
    setPrompt(null);
    setPending(true);
    runAfterModalClose(async () => {
      const next = await evaluate(true);
      if (!pendingRef.current) return;
      if ('done' in next) finish(next.done);
      else show(next.prompt);
    });
  }, [evaluate, finish, setPrompt, show]);

  const { send: sendSetPasswordMail } = mail;

  /** The server now requires the step-up and this device cannot give it. */
  const explainUnavailable = useCallback(
    (error: unknown) => {
      // The server's "confirm it's you", then why this device cannot: no password and no
      // provider to show here; the way out is a password by mail.
      const message = `${apiErrorMessage(error, t('auth.reauth.body'))}\n\n${t('mobile.noPasswordAccountNoProvider')}`;
      appAlert(t('auth.reauth.title'), message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.setPassword'), onPress: sendSetPasswordMail },
      ]);
    },
    [sendSetPasswordMail, t],
  );

  const execute = useCallback(
    async <T,>(
      action: (reauthToken: string | undefined) => Promise<T>,
      allowUnconfirmed: boolean,
    ): Promise<ReauthOutcome<T>> => {
      const first = await obtain(false);
      if (first.kind === 'cancelled') return CANCELLED;
      if (first.kind === 'unavailable' && !allowUnconfirmed) return UNAVAILABLE;
      const used = first.kind === 'token' ? first.token : undefined;
      try {
        return { status: 'done', value: await action(used) };
      } catch (error) {
        if (!isReauthRequired(error)) throw error;
        if (tokenRef.current?.token === used) tokenRef.current = null;
        const again = await obtain(true);
        if (again.kind === 'cancelled') return CANCELLED;
        if (again.kind === 'unavailable') {
          if (!allowUnconfirmed) return UNAVAILABLE;
          explainUnavailable(error);
          return CANCELLED;
        }
        return { status: 'done', value: await action(again.token) };
      }
    },
    [explainUnavailable, obtain],
  );

  /**
   * Run a call that always needs the step-up (`POST /auth/password/set`, link, unlink). Errors of
   * the call itself are thrown to the caller (after the one `REAUTH_REQUIRED` retry); the
   * confirm step's own errors stay inside it.
   */
  const run = useCallback(
    <T,>(action: (reauthToken: string) => Promise<T>) =>
      execute((token) => action(token as string), false),
    [execute],
  );

  /**
   * Run a setting-gated call (account deletion, e-mail change request). It always asks for the
   * step-up when this device can give one. When it cannot (no password, no linked provider shown
   * here), the call goes without a token, which the API accepts while
   * `auth_require_reauth_for_sensitive_actions` is off; once it is on, the API answers
   * `REAUTH_REQUIRED` and the user is offered the set-password mail (then confirms with the
   * password). So the app never blocks these calls on its own.
   */
  const runGated = useCallback(
    <T,>(action: (reauthToken: string | undefined) => Promise<T>) => execute(action, true),
    [execute],
  );

  return {
    run,
    runGated,
    /** The proof is on its way (modal closed, native sheet or request in flight). */
    pending,
    sendSetPasswordMail,
    sendingMail: mail.isPending,
    modal: { prompt, onCancel, onSubmitPassword, onProvider, onRetry },
  };
}

export type ReauthController = ReturnType<typeof useReauth>;
