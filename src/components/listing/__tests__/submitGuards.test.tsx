/**
 * Gönderim guard'ları: IBAN ve gönderici adres AYNI semantiği izler (kapıyla aynı kaynak,
 * `listingGateView`): durum BİLİNMİYORSA (yükleniyor / hata) gönderim engellenir ama "ekle"
 * denmez; "doğrulanıyor / tekrar dene" gösterilir. Kesin eksikte ekleme istemi çıkar.
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

async function submit(ready: (f: ReturnType<typeof useListingForm>) => boolean) {
  const hook = renderForm();
  await waitFor(() => expect(ready(hook.result.current)).toBe(true), { timeout: 5000 });
  await act(async () => {
    await hook.result.current.handleSubmit();
  });
  return hook;
}

describe('gönderim guard\'ları: IBAN ve adres aynı semantik', () => {
  it('IBAN yükleniyor: engellenir, "IBAN ekle" denmez, doğrulanıyor', async () => {
    mockGetBank.mockImplementation(NEVER);
    await submit((f) => f.bankAccountLoading && !f.dispatchAddressLoading);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['Bilgileriniz doğrulanıyor']);
  });

  it('adres yükleniyor: engellenir, "adres ekle" denmez, doğrulanıyor', async () => {
    mockGetAddresses.mockImplementation(NEVER);
    await submit((f) => f.hasBankAccount && f.dispatchAddressLoading);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['Bilgileriniz doğrulanıyor']);
  });

  it('IBAN okunamadı: engellenir, tekrar dene IBAN sorgusunu yeniler', async () => {
    mockGetBank.mockRejectedValue(new Error('network'));
    await submit((f) => f.bankAccountError);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['Bilgileriniz doğrulanamadı']);
    const retry = alertCalls()[0][2].find((b: any) => b.text === 'Tekrar Dene');
    const before = mockGetBank.mock.calls.length;
    mockGetBank.mockResolvedValue({ data: ACCOUNT });
    await act(async () => retry.onPress());
    await waitFor(() => expect(mockGetBank.mock.calls.length).toBeGreaterThan(before));
  });

  it('adres okunamadı: engellenir, tekrar dene adres sorgusunu yeniler', async () => {
    mockGetAddresses.mockRejectedValue(new Error('network'));
    await submit((f) => f.dispatchAddressError);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['Bilgileriniz doğrulanamadı']);
    expect(titles()).not.toContain('İlan vermeden önce kargo çıkış adresi eklemelisiniz');
    const retry = alertCalls()[0][2].find((b: any) => b.text === 'Tekrar Dene');
    const before = mockGetAddresses.mock.calls.length;
    mockGetAddresses.mockResolvedValue({ data: [GOOD_ADDRESS] });
    await act(async () => retry.onPress());
    await waitFor(() => expect(mockGetAddresses.mock.calls.length).toBeGreaterThan(before));
  });

  it('bilinmeyen durum kesin eksiğe baskın: IBAN yok ama adres okunamadı -> doğrulanamadı', async () => {
    mockGetBank.mockResolvedValue({ data: null });
    mockGetAddresses.mockRejectedValue(new Error('network'));
    await submit((f) => f.dispatchAddressError && !f.bankAccountLoading);
    expect(titles()).toEqual(['Bilgileriniz doğrulanamadı']);
  });

  it('IBAN kesin eksik: ekleme istemi', async () => {
    mockGetBank.mockResolvedValue({ data: null });
    await submit((f) => !f.bankAccountLoading && !f.dispatchAddressLoading);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['Banka Hesabı Gerekli']);
    alertCalls()[0][2].find((b: any) => b.text === 'IBAN Ekle').onPress();
    expect(router.push).toHaveBeenCalledWith('/settings/bank-account');
  });

  it('adres kesin eksik: ekleme istemi', async () => {
    mockGetAddresses.mockResolvedValue({ data: [] });
    await submit((f) => f.hasBankAccount && !f.dispatchAddressLoading);
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(titles()).toEqual(['İlan vermeden önce kargo çıkış adresi eklemelisiniz']);
    alertCalls()[0][2].find((b: any) => b.text === 'Adres Ekle').onPress();
    expect(router.push).toHaveBeenCalledWith('/settings/addresses');
  });

  it('ikisi de eksik: önce IBAN', async () => {
    mockGetBank.mockResolvedValue({ data: null });
    mockGetAddresses.mockResolvedValue({ data: [] });
    await submit((f) => !f.bankAccountLoading && !f.dispatchAddressLoading);
    expect(titles()).toEqual(['Banka Hesabı Gerekli']);
  });
});
