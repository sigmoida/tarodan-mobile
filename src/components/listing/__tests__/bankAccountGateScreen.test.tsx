/**
 * IBAN kapısı ekran düzeyinde (web gibi): hesap yokken form HİÇ görünmez
 * (eskiden form açık, yalnız gönderimde uyarı vardı). Hesap gelince form açılır.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithProviders } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGetBank = jest.fn();
const mockGetAddr = jest.fn();
const ADDRESS = { id: 'a1', isDefault: true, phone: '+905321234567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cd. 1' };
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(async (url: string) =>
      url === '/products/my/stats'
        ? { data: { limits: { tierName: 'Free', tierType: 'free' }, summary: { max: 10, used: 0, remaining: 10, canCreate: true } } }
        : { data: { scales: [], materials: [], brands: [], manufacturers: [] } },
    ),
    post: jest.fn(),
    patch: jest.fn(),
  },
  productsApi: { create: jest.fn(), update: jest.fn(), getMyListings: jest.fn(), getMyStats: jest.fn(), getMyById: jest.fn(), delete: jest.fn() },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: { getAll: () => mockGetAddr() },
  shippingApi: { getPackageTiers: jest.fn(async () => ({ data: { tariffVersion: 1, tiers: [] } })) },
  bankAccountApi: { get: () => mockGetBank() },
}));

const mockAuthUser = { membershipTier: 'free', listingCount: 0 };
const mockAuthLimits = { maxListings: 10, maxImagesPerListing: 5, canTrade: false };
const mockRefresh = jest.fn(async () => {});
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      isLoading: false,
      user: mockAuthUser,
      limits: mockAuthLimits,
      refreshUserData: mockRefresh,
    };
    return sel ? sel(state) : state;
  },
}));

import ListingForm from '../ListingForm';

const ACCOUNT = { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false };

beforeEach(() => {
  mockGetBank.mockReset();
  mockGetAddr.mockReset().mockResolvedValue({ data: [ADDRESS] });
  (router.push as jest.Mock).mockClear();
});

it('hesap yok: IBAN istemi görünür, form (gönder düğmesi) görünmez', async () => {
  mockGetBank.mockResolvedValue({ data: null });
  renderWithProviders(<ListingForm mode="create" />);
  expect(await screen.findByText('İlan vermeden önce banka hesabı ekleyin')).toBeOnTheScreen();
  expect(screen.queryByText('İlan Oluştur')).toBeNull();
  fireEvent.press(screen.getByText('IBAN Ekle'));
  expect(router.push).toHaveBeenCalledWith('/settings/bank-account?from=listing');
});

it('okuma hatası: "IBAN ekle" yok, Tekrar Dene var; deneyince hesap gelir ve form açılır', async () => {
  mockGetBank.mockRejectedValue(new Error('network'));
  renderWithProviders(<ListingForm mode="create" />);
  const retry = await screen.findByText('Tekrar Dene', undefined, { timeout: 5000 });
  expect(screen.queryByText('IBAN Ekle')).toBeNull();
  expect(screen.queryByText('İlan Oluştur')).toBeNull();

  mockGetBank.mockResolvedValue({ data: ACCOUNT });
  fireEvent.press(retry);
  await waitFor(() => expect(screen.getByText('İlan Oluştur')).toBeOnTheScreen());
});

it('hesap var: kapı yok, form açık', async () => {
  mockGetBank.mockResolvedValue({ data: ACCOUNT });
  renderWithProviders(<ListingForm mode="create" />);
  expect(await screen.findByText('İlan Oluştur')).toBeOnTheScreen();
  expect(screen.queryByText('IBAN Ekle')).toBeNull();
});

it('IBAN ve adres okuması birlikte hata verirse TEK Tekrar Dene; deneyince ikisi de çekilir ve form açılır', async () => {
  mockGetBank.mockRejectedValue(new Error('network'));
  mockGetAddr.mockRejectedValue(new Error('network'));
  renderWithProviders(<ListingForm mode="create" />);
  const retry = await screen.findByText('Tekrar Dene', undefined, { timeout: 5000 });
  expect(screen.getAllByText('Tekrar Dene')).toHaveLength(1);
  expect(screen.queryByText('IBAN Ekle')).toBeNull();
  expect(screen.queryByText('Adres Ekle')).toBeNull();

  mockGetBank.mockResolvedValue({ data: ACCOUNT });
  mockGetAddr.mockResolvedValue({ data: [ADDRESS] });
  fireEvent.press(retry);
  await waitFor(() => expect(screen.getByText('İlan Oluştur')).toBeOnTheScreen());
});

it('IBAN ve adres yok: iki istem alt alta, form yok', async () => {
  mockGetBank.mockResolvedValue({ data: null });
  mockGetAddr.mockResolvedValue({ data: [] });
  renderWithProviders(<ListingForm mode="create" />);
  expect(await screen.findByText('İlan vermeden önce banka hesabı ekleyin')).toBeOnTheScreen();
  expect(screen.getByText('İlan vermeden önce kargo çıkış adresi eklemelisiniz')).toBeOnTheScreen();
  expect(screen.queryByText('İlan Oluştur')).toBeNull();
});
