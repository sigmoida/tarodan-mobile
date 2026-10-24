/**
 * Android `DEVELOPER_ERROR` (code 10) means the Google Cloud OAuth client / signing SHA-1 does
 * not match the build. The user sees a readable message, not the raw native text, and the
 * fault is reported to Sentry because the fix is on our side.
 */
import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: { login: jest.Mock }) => unknown) => {
    const state = { login: jest.fn() };
    return sel ? sel(state) : state;
  },
}));
const mockSignInWithGoogle = jest.fn();
jest.mock('@/services/googleSignin', () => ({ signInWithGoogle: (...a: unknown[]) => mockSignInWithGoogle(...a) }));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(false),
}));
const mockLoginWithGoogle = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: { loginWithGoogle: (...a: unknown[]) => mockLoginWithGoogle(...a), loginWithApple: jest.fn() },
}));
const mockCapture = jest.fn();
jest.mock('@/services/sentry', () => ({ captureException: (...a: unknown[]) => mockCapture(...a) }));

import { appAlert } from '@/ui';
import { isGoogleDeveloperError } from '@/services/googleSigninErrors';
import { useSocialSignIn } from '../useSocialSignIn';

const mockAlert = appAlert as unknown as jest.Mock;
const nativeDeveloperError = Object.assign(
  new Error('DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting'),
  { code: '10' },
);

beforeEach(() => jest.clearAllMocks());

describe('isGoogleDeveloperError', () => {
  it('matches the native code and the message', () => {
    expect(isGoogleDeveloperError(nativeDeveloperError)).toBe(true);
    expect(isGoogleDeveloperError({ code: 10 })).toBe(true);
    expect(isGoogleDeveloperError({ message: 'DEVELOPER_ERROR: x' })).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isGoogleDeveloperError({ code: 'SIGN_IN_CANCELLED' })).toBe(false);
    expect(isGoogleDeveloperError(new Error('network'))).toBe(false);
    expect(isGoogleDeveloperError(null)).toBe(false);
  });
});

describe('useSocialSignIn — Google DEVELOPER_ERROR', () => {
  it('shows a readable message (no raw native text, with the code) and reports to Sentry', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(nativeDeveloperError);
    const { result } = renderHook(() => useSocialSignIn());

    await act(async () => {
      await result.current.handleGoogle();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'auth.googleSignInFailedTitle',
      'mobile.googleDeveloperError (common.errorCodeSuffix)',
    );
    expect(mockCapture).toHaveBeenCalledWith(
      nativeDeveloperError,
      expect.objectContaining({ tags: { flow: 'auth.google', reason: 'developer_error', code: '10' } }),
    );
  });

  it('does not treat an API error with code 10 as a native DEVELOPER_ERROR', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce('id-token');
    mockLoginWithGoogle.mockRejectedValueOnce(
      Object.assign(new Error('server said no'), { code: '10', response: { data: { message: 'api message' } } }),
    );
    const { result } = renderHook(() => useSocialSignIn());

    await act(async () => {
      await result.current.handleGoogle();
    });

    expect(mockCapture).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('auth.googleSignInFailedTitle', 'api message (common.errorCodeSuffix)');
  });

  it('does not report a user cancellation', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED' });
    const { result } = renderHook(() => useSocialSignIn());

    await act(async () => {
      await result.current.handleGoogle();
    });

    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
