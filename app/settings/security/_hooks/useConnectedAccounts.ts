import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm, runAfterModalClose, toast } from '@/ui';
import { qk } from '@/lib/query';
import { apiErrorMessage } from '@/lib/api/errorText';
import {
  isServerOrNetworkFailure,
  isSessionEndedError,
  signInMethodsErrorCode,
} from '@/lib/api/reauthError';
import { useReauth, type ReauthOutcome } from '@/hooks/useReauth';
import { useSignInMethods, useWriteSignInMethods } from '@/hooks/useSignInMethods';
import {
  SIGN_IN_PROVIDER_NAMES,
  canConfirmOnDevice,
  visibleSocialProvidersNow,
  type VisibleSocialProviders,
} from '@/components/auth/socialProviders';
import {
  isProviderCancel,
  requestProviderCredential,
  type ProviderCredential,
} from '@/components/auth/providerCredential';
import { isGoogleDeveloperError } from '@/services/googleSigninErrors';
import { captureException } from '@/services/sentry';
import { canUnlinkProvider, type SignInMethods, type SignInProvider } from '@/types/sign-in-methods';
import { connectedAccountRows, isStaleListRefusal } from '../_lib/connectedAccounts';
import { useDoLinkProvider } from './useDoLinkProvider';
import { useDoUnlinkProvider } from './useDoUnlinkProvider';

type Write = 'provider_link' | 'provider_unlink';

/** Resolves once a modal or native sheet that just closed has finished (iOS modal rule). */
const afterSheetClosed = () => new Promise<void>((resolve) => runAfterModalClose(resolve));

/**
 * How long a provider credential is reused for a `REAUTH_REQUIRED` retry. Apple's one-time
 * `authorizationCode` lives about 5 minutes; an older credential is asked for again, so the API
 * can still exchange the code and later revoke the Apple token.
 */
export const CREDENTIAL_REUSE_MS = 4 * 60_000;

/** The provider's sheet failed or was closed (not an API answer). */
class CredentialFailure {
  constructor(readonly cause: unknown) {}
}

/**
 * Connected accounts (web `useConnectedAccounts`): connect and disconnect Google and Apple, both
 * behind the step-up of `useReauth` (one step-up and one in-memory token for the screen).
 *
 * - Connect: the confirm step first, then the provider's sheet (opened only after the modal has
 *   closed, iOS modal rule), then the link at once. Web asks the provider first only because a
 *   browser popup must open from the click; mobile has no such rule, and this order sends Apple's
 *   one-time `authorizationCode` (about 5 minutes) while it is fresh however long the confirm
 *   step took. A `403 REAUTH_REQUIRED` retry reuses the credential while it is younger than
 *   `CREDENTIAL_REUSE_MS` (the step-up guard runs before the route, so it was not spent). A
 *   closed sheet costs nothing: the step-up token stays for the next try.
 * - Disconnect: only when `canUnlinkProvider` allows it (D1); the confirmation (with the D2
 *   re-link note) first, then the confirm step, then the unlink.
 * - A device that cannot confirm (no password and no linked provider shown here, ADR 0012) is
 *   told so before any sheet opens, with the set-password mail as the way out.
 * - Every success writes the answered `SignInMethods` to the query (no reload) and toasts. A
 *   404/409 refusal re-reads the methods and shows the server's message (`LAST_SIGN_IN_METHOD`
 *   reads as the D1 hint). Nothing here signs out: only a 401 does, in the client.
 * - One flow at a time: a ref lock stops double taps; `busyProvider` spans the whole flow
 *   (sheet, confirmation, step-up, write), which no single mutation's variables cover.
 * - Sentry: only 5xx and network failures of the writes, and the Google DEVELOPER_ERROR, tagged
 *   with the flow and the provider; never a token, a provider e-mail or a cancel.
 */
export function useConnectedAccounts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const signIn = useSignInMethods();
  const reauth = useReauth('connected_accounts');
  const link = useDoLinkProvider();
  const unlink = useDoUnlinkProvider();
  const writeMethods = useWriteSignInMethods();
  const lock = useRef(false);
  const [busyProvider, setBusyProvider] = useState<SignInProvider | null>(null);

  // Which providers this device shows, read once before any row renders: the async Apple check
  // must not make the Apple row appear a moment after the others.
  const [visible, setVisible] = useState<VisibleSocialProviders | null>(null);
  useEffect(() => {
    let active = true;
    void visibleSocialProvidersNow().then((next) => {
      if (active) setVisible(next);
    });
    return () => {
      active = false;
    };
  }, []);
  const rows = signIn.methods && visible ? connectedAccountRows(signIn.methods, visible, Platform.OS) : null;

  /** The freshest known methods (a write or refetch may have landed since the last render). */
  const currentMethods = () => queryClient.getQueryData<SignInMethods>(qk.auth.signInMethods) ?? signIn.methods;

  /** Can this device give the step-up? Unknown methods: let the step-up itself decide. */
  const canConfirmHere = async () => {
    const methods = currentMethods();
    return !methods || canConfirmOnDevice(methods, await visibleSocialProvidersNow());
  };

  const settle = <T,>(outcome: ReauthOutcome<T>, success: string) => {
    if (outcome.status === 'unavailable') reauth.explainUnavailable();
    else if (outcome.status === 'done') toast.success(success);
  };

  const fail = (error: unknown, write: Write, provider: SignInProvider) => {
    if (isSessionEndedError(error)) return;
    if (isStaleListRefusal(signInMethodsErrorCode(error))) writeMethods(undefined);
    // Not an API answer (a native or JS fault): reported, and only the plain line is shown.
    const isApiError = !!(error as { isAxiosError?: unknown } | null)?.isAxiosError;
    if (!isApiError || isServerOrNetworkFailure(error)) {
      captureException(error, { level: 'error', tags: { flow: `auth.${write}`, provider } });
    }
    toast.error(isApiError ? apiErrorMessage(error, t('common.operationFailed')) : t('common.operationFailed'));
  };

  /** The provider's sheet failed (not a cancel): web's plain line, never the native text. */
  const credentialFailed = (provider: SignInProvider, error: unknown) => {
    if (isProviderCancel(provider, error)) return;
    if (provider === 'google' && isGoogleDeveloperError(error)) {
      captureException(error, {
        level: 'error',
        tags: { flow: 'auth.provider_link', provider, reason: 'developer_error' },
      });
    }
    toast.error(t(provider === 'google' ? 'auth.googleSignInFailed' : 'auth.appleSignInFailed'));
  };

  const connect = async (provider: SignInProvider) => {
    if (lock.current) return;
    lock.current = true;
    setBusyProvider(provider);
    try {
      if (!(await canConfirmHere())) {
        reauth.explainUnavailable();
        return;
      }
      let held: { credential: ProviderCredential; at: number } | null = null;
      const outcome = await reauth.run(async (reauthToken) => {
        if (!held || Date.now() - held.at > CREDENTIAL_REUSE_MS) {
          // The confirm step (or a provider sheet it opened) has just closed.
          await afterSheetClosed();
          try {
            held = { credential: await requestProviderCredential(provider), at: Date.now() };
          } catch (error) {
            throw new CredentialFailure(error);
          }
        }
        return link.mutateAsync({ credential: held.credential, reauthToken });
      });
      settle(outcome, t('profile.connectedAccounts.connectSuccess', { provider: SIGN_IN_PROVIDER_NAMES[provider] }));
    } catch (error) {
      if (error instanceof CredentialFailure) credentialFailed(provider, error.cause);
      else fail(error, 'provider_link', provider);
    } finally {
      lock.current = false;
      setBusyProvider(null);
    }
  };

  const disconnect = async (provider: SignInProvider) => {
    const methods = currentMethods();
    if (lock.current || !methods || !canUnlinkProvider(methods, provider)) return;
    lock.current = true;
    setBusyProvider(provider);
    try {
      if (!(await canConfirmHere())) {
        reauth.explainUnavailable();
        return;
      }
      const name = SIGN_IN_PROVIDER_NAMES[provider];
      const ok = await confirm({
        title: t('profile.connectedAccounts.disconnectTitle', { provider: name }),
        message: `${t('profile.connectedAccounts.disconnectConfirm', { provider: name })}\n\n${t(
          'profile.connectedAccounts.relinkNote',
          { provider: name },
        )}`,
        confirmLabel: t('profile.connectedAccounts.disconnect'),
        destructive: true,
      });
      // `confirm` resolves after its dialog has closed, so the confirm step may open now.
      if (!ok) return;
      const outcome = await reauth.run((reauthToken) => unlink.mutateAsync({ provider, reauthToken }));
      settle(outcome, t('profile.connectedAccounts.disconnectSuccess', { provider: name }));
    } catch (error) {
      fail(error, 'provider_unlink', provider);
    } finally {
      lock.current = false;
      setBusyProvider(null);
    }
  };

  return {
    rows,
    isLoading: signIn.isLoading || (!!signIn.methods && !visible),
    /** Only a failed first load shows the error; cached methods stay on a failed refetch. */
    loadError: !signIn.methods && signIn.isError,
    retry: () => void signIn.refetch(),
    busyProvider,
    connect: (provider: SignInProvider) => void connect(provider),
    disconnect: (provider: SignInProvider) => void disconnect(provider),
    reauthModal: reauth.modal,
  };
}

export type ConnectedAccountsController = ReturnType<typeof useConnectedAccounts>;
