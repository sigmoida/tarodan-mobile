/**
 * Android eşi (bkz. address-limit-message-ios.test.tsx): adres limiti mesajı
 * Android/web'de DEĞİŞMEDEN eski `address.limitBody` (Premium'a atıf yapan
 * metin) olmaya devam eder, yükseltme düğmesiyle birlikte.
 */
import React from 'react';
import { Platform } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
import { appAlert } from '@/ui';
const mockAlert = appAlert as unknown as jest.Mock;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, limits: { maxAddresses: 1 } };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: [{ id: 'a1', title: 'Ev' }] })),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// KRİTİK SIRA: bkz. iOS eşi.
Platform.OS = 'android';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAddresses } = require('../addresses/_hooks/useAddresses');

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => jest.clearAllMocks());

it('Android: adres limiti mesajı eski `address.limitBody`, yükseltme düğmesi var', async () => {
  const { result } = renderHook(() => useAddresses(), { wrapper });

  await waitFor(() => expect(result.current.addresses).toHaveLength(1));

  act(() => {
    result.current.openAddDialog();
  });

  expect(mockAlert).toHaveBeenCalledTimes(1);
  const [, message, buttons] = mockAlert.mock.calls[0];
  expect(message).toBe('address.limitBody');
  expect(buttons).toHaveLength(2);
});
