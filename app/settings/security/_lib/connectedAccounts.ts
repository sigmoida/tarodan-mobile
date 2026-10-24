import {
  SIGN_IN_METHODS_ERROR_CODES,
  SIGN_IN_PROVIDERS,
  canUnlinkProvider,
  type LinkedSignInProvider,
  type SignInMethods,
  type SignInMethodsErrorCode,
  type SignInProvider,
} from '@/types/sign-in-methods';
import type { VisibleSocialProviders } from '@/components/auth/socialProviders';
import type { MessageKey } from '@/i18n/lib/generated/keys';

/**
 * What a provider row offers when the provider is not linked:
 * - `connect`: the Connect button (the provider can sign in on this device);
 * - `hint`: a line in place of Connect, when a store or build rule keeps the provider off here
 *   (ADR 0012: Apple is iOS-only; Google is off on Android until its OAuth client exists);
 * - `hidden`: no row at all (web hides a provider it cannot connect, e.g. a build without the
 *   iOS Google client).
 */
export type ConnectOffer = { kind: 'connect' } | { kind: 'hint'; hint: MessageKey } | { kind: 'hidden' };

export interface ConnectedAccountRowModel {
  provider: SignInProvider;
  linked: LinkedSignInProvider | undefined;
  /** Linked rows: Disconnect is enabled only when the D1 rule allows it (`canUnlinkProvider`). */
  canUnlink: boolean;
  /** Not-linked rows: Connect or the platform hint. `null` on a linked row. */
  offer: Exclude<ConnectOffer, { kind: 'hidden' }> | null;
}

/** The Connect offer for a provider that is not linked, by platform (`Platform.OS`). */
export function connectOffer(
  provider: SignInProvider,
  visible: Pick<VisibleSocialProviders, 'google' | 'apple'>,
  platform: string,
): ConnectOffer {
  if (visible[provider]) return { kind: 'connect' };
  if (provider === 'apple' && platform !== 'ios') {
    return { kind: 'hint', hint: 'mobile.connectedAccounts.appleIosOnly' };
  }
  if (provider === 'google' && platform === 'android') {
    return { kind: 'hint', hint: 'mobile.connectedAccounts.googleUnavailableAndroid' };
  }
  return { kind: 'hidden' };
}

/**
 * One row per provider (`SIGN_IN_PROVIDERS` order, as web). A linked provider always has a row
 * (status and Disconnect, on every platform); a provider that is not linked follows
 * `connectOffer`.
 */
export function connectedAccountRows(
  methods: SignInMethods,
  visible: Pick<VisibleSocialProviders, 'google' | 'apple'>,
  platform: string,
): ConnectedAccountRowModel[] {
  return SIGN_IN_PROVIDERS.flatMap((provider) => {
    const linked = methods.providers.find((p) => p.provider === provider);
    const offer = linked ? null : connectOffer(provider, visible, platform);
    if (offer?.kind === 'hidden') return [];
    return [{ provider, linked, canUnlink: canUnlinkProvider(methods, provider), offer }];
  });
}

/**
 * Refusals of a link or unlink that mean the list on screen is out of date (web
 * `STALE_LIST_CODES`), plus the "linked to another account" conflict: every 404/409 of these
 * routes re-reads the sign-in methods. `LAST_SIGN_IN_METHOD` then disables Disconnect.
 */
const STALE_LIST_CODES: ReadonlySet<SignInMethodsErrorCode> = new Set([
  SIGN_IN_METHODS_ERROR_CODES.providerAlreadyLinked,
  SIGN_IN_METHODS_ERROR_CODES.providerLinkedToOtherAccount,
  SIGN_IN_METHODS_ERROR_CODES.providerNotLinked,
  SIGN_IN_METHODS_ERROR_CODES.lastSignInMethod,
]);

export function isStaleListRefusal(code: SignInMethodsErrorCode | null): boolean {
  return code !== null && STALE_LIST_CODES.has(code);
}
