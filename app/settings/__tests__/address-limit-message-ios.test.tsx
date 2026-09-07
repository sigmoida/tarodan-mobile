/**
 * `useAddresses`'in adres limiti uyarısı: iOS'ta mesaj `address.limitBody`
 * (Premium'a atıf yapan metin) DEĞİL, nötr `address.limitReachedInfo`
 * olmalı — yükseltme düğmesinin yokluğu yetmez, metin de hesap durumunu
 * anlatmalı (kural: iOS'ta hiçbir metin ücretli katmana işaret etmez).
 *
 * Android eşi: address-limit-message-android.test.tsx. Ayrı dosyalar: bkz.
 * `app/(auth)/login/__tests__/corporate-upgrade-ios.test.tsx` üstündeki not —
 * `CAN_BUY_DIGITAL` import-anında sabitlenir, `useAddresses` (dolayısıyla
 * `@/lib/purchases`) require edilmeden önce Platform.OS set edilmeli;
 * `jest.isolateModules` React'i de izole edip hook render'ını bozar.
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
  useAuthStore: () => ({ isAuthenticated: true, limits: { maxAddresses: 1 } }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: [{ id: 'a1', title: 'Ev' }] })),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// KRİTİK SIRA: bkz. dosya üstü not.
Platform.OS = 'ios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAddresses } = require('../addresses/_hooks/useAddresses');

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => jest.clearAllMocks());

it('iOS: adres limiti mesajı nötr `address.limitReachedInfo` — `address.limitBody` DEĞİL', async () => {
  const { result } = renderHook(() => useAddresses(), { wrapper });

  await waitFor(() => expect(result.current.addresses).toHaveLength(1));

  act(() => {
    result.current.openAddDialog();
  });

  expect(mockAlert).toHaveBeenCalledTimes(1);
  const [, message, buttons] = mockAlert.mock.calls[0];
  expect(message).toBe('address.limitReachedInfo');
  expect(buttons).toHaveLength(1);
});
