/**
 * Android eşi (bkz. corporate-upgrade-ios.test.tsx): kurumsal yükseltme
 * uyarısı Android/web'de DEĞİŞMEDEN gösterilmeye devam eder.
 */
import React from 'react';
import { Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
import { appAlert } from '@/ui';
const mockAlert = appAlert as unknown as jest.Mock;

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: any[]) => mockReplace(...a),
    push: (...a: any[]) => mockPush(...a),
    back: jest.fn(),
    canGoBack: () => false,
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockLogin = jest.fn(() => Promise.resolve());
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { login: mockLogin };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/services/googleSignin', () => ({ signInWithGoogle: jest.fn() }));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(false),
}));

const mockGetProfile = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(() =>
      Promise.resolve({ data: { accessToken: 'tok', refreshToken: 'ref', user: {} } }),
    ),
    getProfile: (...a: any[]) => mockGetProfile(...a),
    resendVerification: jest.fn(),
  },
}));

// KRİTİK SIRA: bkz. iOS eşi — Platform.OS, useLogin require edilmeden önce set edilmeli.
Platform.OS = 'android';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLogin } = require('../_hooks/useLogin');

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const businessProfile = {
  data: { user: { companyName: 'Acme', taxId: '1234567890', membershipTier: 'free' } },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue(businessProfile);
});

it('Android: kurumsal yükseltme uyarısı gösterilir, yükseltme düğmesi var', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });

  await act(async () => {
    await result.current.loginMutation.mutateAsync({
      email: 'a@b.com',
      password: 'Password1',
    } as any);
  });

  expect(mockAlert).toHaveBeenCalledTimes(1);
  const [title, , buttons] = mockAlert.mock.calls[0];
  expect(title).toBe('auth.corporateUpgradeTitle');
  expect(buttons).toHaveLength(2);
  expect(mockReplace).not.toHaveBeenCalledWith('/');
});
