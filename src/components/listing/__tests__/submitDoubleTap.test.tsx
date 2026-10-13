/**
 * İlan çift gönderimi: `handleSubmit` re-entry ref guard'ı taşır. Aynı karede (state güncellenmeden)
 * gelen iki dokunuş `productsApi.create`'i iki kez çağırmamalı; gönderim bitince yeniden gönderilebilmeli.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { router } from 'expo-router';
import { makeTestQueryClient } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGetBank = jest.fn();
const mockGetAddresses = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(async () => ({ data: {} })), post: jest.fn(), patch: jest.fn() },
  productsApi: { create: jest.fn(), update: jest.fn(), getMyListings: jest.fn(), getMyStats: jest.fn(), getMyById: jest.fn(), delete: jest.fn() },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: { getAll: () => mockGetAddresses() },
  shippingApi: { getPackageTiers: jest.fn(async () => ({ data: { tariffVersion: 1, tiers: [] } })) },
  bankAccountApi: { get: () => mockGetBank() },
}));

const mockAuthUser = { membershipTier: 'free', listingCount: 0 };
const mockAuthLimits = { maxListings: 10, maxImagesPerListing: 5, canTrade: false };
const mockRefreshUserData = jest.fn(async () => {});
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      isLoading: false,
      user: mockAuthUser,
      limits: mockAuthLimits,
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

// Doğrulamayı geçir: gönderimdeki IBAN kapısına ulaşılsın (asıl denenen o).
jest.mock('../_lib/validate', () => ({
  ...jest.requireActual('../_lib/validate'),
  firstListingValidationError: () => null,
}));

import { productsApi } from '@/lib/api';
import { useListingForm } from '../_hooks/useListingForm';

const ACCOUNT = { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false };
const GOOD_ADDRESS = { id: 'a1', isDefault: true, phone: '+905321234567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cd. 1' };
const NEVER = () => new Promise(() => {});

function renderForm() {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useListingForm({ mode: 'create' } as any), { wrapper: Wrapper });
}

const alertCalls = () => (appAlert as jest.Mock).mock.calls;
const titles = () => alertCalls().map((c) => c[0]);

beforeEach(() => {
  mockGetBank.mockReset().mockResolvedValue({ data: ACCOUNT });
  mockGetAddresses.mockReset().mockResolvedValue({ data: [GOOD_ADDRESS] });
  (productsApi.create as jest.Mock).mockClear();
  (router.push as jest.Mock).mockClear();
  (appAlert as jest.Mock).mockClear?.();
});


async function ready() {
  const hook = renderForm();
  await waitFor(
    () => expect(hook.result.current.hasBankAccount && !hook.result.current.dispatchAddressLoading).toBe(true),
    { timeout: 5000 },
  );
  return hook;
}

describe('ilan çift gönderimi', () => {
  it('aynı karede iki dokunuş create\'i bir kez çağırır', async () => {
    let resolveCreate!: () => void;
    (productsApi.create as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => (resolveCreate = () => r())),
    );
    const hook = await ready();

    await act(async () => {
      void hook.result.current.handleSubmit();
      void hook.result.current.handleSubmit(); // state henüz güncellenmedi: ref guard keser
    });
    expect(productsApi.create).toHaveBeenCalledTimes(1);

    await act(async () => resolveCreate());
  });

  it('gönderim bitince guard açılır: sonraki gönderim çalışır', async () => {
    (productsApi.create as jest.Mock).mockResolvedValue({ data: {} });
    const hook = await ready();
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(productsApi.create).toHaveBeenCalledTimes(1);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(productsApi.create).toHaveBeenCalledTimes(2);
  });

  it('create hata verirse de guard açılır (tekrar denenebilir)', async () => {
    (productsApi.create as jest.Mock).mockRejectedValue(new Error('boom'));
    const hook = await ready();
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(productsApi.create).toHaveBeenCalledTimes(2);
  });
});
