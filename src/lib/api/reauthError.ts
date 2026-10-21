/**
 * Error helpers for the sign-in methods and step-up routes (contract delta 2026-10-21).
 * Switch on `errorCode`, never on the localised `message`. A step-up problem is never a
 * 401: the axios client (`./client`) treats only 401 as an expired session, so a
 * `403 REAUTH_*`, `429 REAUTH_LOCKED` or `503 REAUTH_UNAVAILABLE` reaches the caller as is.
 */
import {
  SIGN_IN_METHODS_ERROR_CODES,
  type SignInMethodsErrorCode,
} from '@/types/sign-in-methods';
import { isNoResponseNetworkError } from '@/lib/network/networkFailure';

/**
 * `SESSION_STALE` of `./client`, read by value (as `@/lib/network/networkFailure` does) so this
 * module stays free of the axios client and its interceptors.
 */
const SESSION_STALE = 'SESSION_STALE';
const isSessionStaleError = (error: unknown): boolean =>
  (error as { code?: unknown } | null | undefined)?.code === SESSION_STALE;

type ErrorShape = { response?: { status?: unknown; data?: { errorCode?: unknown } } } | null | undefined;

const KNOWN_CODES = new Set<string>(Object.values(SIGN_IN_METHODS_ERROR_CODES));

/** The `errorCode` of a sign-in methods / step-up answer, or `null` for any other error. */
export function signInMethodsErrorCode(error: unknown): SignInMethodsErrorCode | null {
  const code = (error as ErrorShape)?.response?.data?.errorCode;
  return typeof code === 'string' && KNOWN_CODES.has(code) ? (code as SignInMethodsErrorCode) : null;
}

/** `403 REAUTH_REQUIRED`: the token is missing, expired or not this user's; confirm again. */
export function isReauthRequired(error: unknown): boolean {
  return (
    (error as ErrorShape)?.response?.status === 403 &&
    signInMethodsErrorCode(error) === SIGN_IN_METHODS_ERROR_CODES.reauthRequired
  );
}

/**
 * The session ended or changed while the request was in flight (a 401 the client could not
 * refresh, or `SESSION_STALE`). The client has already handled it (sign-out, redirect); the
 * caller only stops, it shows nothing.
 */
export function isSessionEndedError(error: unknown): boolean {
  return (error as ErrorShape)?.response?.status === 401 || isSessionStaleError(error);
}

/**
 * Worth a Sentry report: no answer (network, timeout; not a cancel) or a 5xx. Expected 4xx
 * answers (wrong proof, lockout, conflicts) are never reported (`src/lib/api/CLAUDE.md` › Errors).
 */
export function isServerOrNetworkFailure(error: unknown): boolean {
  if (isNoResponseNetworkError(error)) return true;
  const status = (error as ErrorShape)?.response?.status;
  return typeof status === 'number' && status >= 500;
}
