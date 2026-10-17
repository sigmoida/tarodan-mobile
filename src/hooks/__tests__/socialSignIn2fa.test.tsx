/**
 * 2FA'sı açık hesap Google/Apple ile token alamaz: sunucu `401 { errorCode:
 * 'TWO_FACTOR_PASSWORD_REQUIRED' }` döner (ikinci adım yalnız parola girişinde). Ham sunucu
 * mesajı yerine açıklama gösterilir ve kullanıcı parola girişine (2FA adımının olduğu akış)
 * alınır. `200 + requires2FA` de aynı yola gider ("beklenmeyen yanıt" değil).
 */
import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: (...a: unknown[]) => mockPush(...a) },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const mockLogin = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { login: mockLogin };
    return sel ? sel(state) : state;
  },
}));
jest.mock('@/services/googleSignin', () => ({ signInWithGoogle: jest.fn(async () => 'id-token') }));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(async () => ({ identityToken: 'apple' })),
  isAppleAvailable: () => Promise.resolve(true),
}));
const mockGoogle = jest.fn();
const mockApple = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: {
    loginWithGoogle: (...a: unknown[]) => mockGoogle(...a),
    loginWithApple: (...a: unknown[]) => mockApple(...a),
  },
}));

import { appAlert } from '@/ui';
import { useSocialSignIn } from '../useSocialSignIn';

const mockAlert = appAlert as unknown as jest.Mock;

const twoFactorRejection = {
  response: {
    status: 401,
    data: { errorCode: 'TWO_FACTOR_PASSWORD_REQUIRED', message: 'İki faktörlü doğrulama…' },
  },
};

/** Gösterilen dialog'un tek düğmesine basar. */
const pressOk = () => {
  const buttons = mockAlert.mock.calls[0]?.[2] as { onPress?: () => void }[];
  buttons[0]?.onPress?.();
};

beforeEach(() => jest.clearAllMocks());

it('Google: 2FA hesabı → açıklama + giriş ekranının parola akışına yönlendirme', async () => {
  mockGoogle.mockRejectedValueOnce(twoFactorRejection);
  const { result } = renderHook(() => useSocialSignIn());

  await act(async () => {
    await result.current.handleGoogle();
  });

  expect(mockAlert).toHaveBeenCalledWith('auth.socialTwoFactorTitle', 'auth.socialTwoFactorBody', expect.any(Array));
  expect(mockLogin).not.toHaveBeenCalled();
  pressOk();
  expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
});

it('Apple: giriş ekranında verilen geçiş kullanılır (e-posta/parola adımına dönüş)', async () => {
  mockApple.mockRejectedValueOnce(twoFactorRejection);
  const onPasswordLoginRequired = jest.fn();
  const { result } = renderHook(() => useSocialSignIn({ onPasswordLoginRequired }));

  await act(async () => {
    await result.current.handleApple();
  });
  pressOk();

  expect(onPasswordLoginRequired).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('200 + requires2FA da aynı yoldan: "beklenmeyen yanıt" gösterilmez, oturum açılmaz', async () => {
  mockGoogle.mockResolvedValueOnce({ data: { requires2FA: true } });
  const { result } = renderHook(() => useSocialSignIn());

  await act(async () => {
    await result.current.handleGoogle();
  });

  expect(mockAlert).toHaveBeenCalledWith('auth.socialTwoFactorTitle', 'auth.socialTwoFactorBody', expect.any(Array));
  expect(mockLogin).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it('başarılı sosyal giriş değişmedi: oturum açılır, ana sayfaya geçilir', async () => {
  mockGoogle.mockResolvedValueOnce({ data: { tokens: { accessToken: 'at', refreshToken: 'rt' }, user: { id: 'u1' } } });
  const { result } = renderHook(() => useSocialSignIn());

  await act(async () => {
    await result.current.handleGoogle();
  });

  expect(mockLogin).toHaveBeenCalledWith('at', { id: 'u1' }, 'rt');
  expect(mockPush).toHaveBeenCalledWith('/');
});
