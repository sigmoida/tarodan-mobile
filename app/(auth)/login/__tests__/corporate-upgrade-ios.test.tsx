/**
 * Kurumsal yükseltme uyarısı yalnız kurumsal ÜYELİĞE SATIŞ yapmak için var.
 * iOS'ta satış yüzeyi kapalı (Guideline 3.1.3) → geriye gösterilecek nötr bir
 * şey kalmıyor, bu yüzden uyarı hiç gösterilmez ve "Daha sonra" düğmesinin
 * gittiği yere (ana sayfa) sessizce geçilir.
 *
 * Ayrı dosya (Android eşi: corporate-upgrade-android.test.tsx): `CAN_BUY_DIGITAL`
 * `@/lib/purchases`'ta import-anında sabitlenen bir değer — `useLogin`
 * require edilmeden ÖNCE `Platform.OS` bu dosyada set edilir. `jest.isolateModules`
 * kullanmıyoruz çünkü hook'u yeniden require etmek `react`'i de izole ederdi ve
 * `renderHook`'un kullandığı react-test-renderer ile "Invalid hook call" çakışması
 * yaratırdı.
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

// KRİTİK SIRA: Platform.OS, useLogin (ve dolayısıyla @/lib/purchases) require
// edilmeden önce 'ios' olmalı — CAN_BUY_DIGITAL import-anında sabitlenir.
Platform.OS = 'ios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLogin } = require('../_hooks/useLogin');

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// Kurumsal bilgileri tamamlanmış ama hâlâ ücretsiz tier — dalı tetikler.
const businessProfile = {
  data: { user: { companyName: 'Acme', taxId: '1234567890', membershipTier: 'free' } },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue(businessProfile);
});

it('iOS: kurumsal yükseltme uyarısı gösterilmez, ana sayfaya geçilir', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });

  await act(async () => {
    await result.current.loginMutation.mutateAsync({
      email: 'a@b.com',
      password: 'Password1',
    } as any);
  });

  expect(mockAlert).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/');
});
