/**
 * P2 #7 — yeni ilan doğrudan indirimli açılabilmeli.
 *
 * Payload tarafı hazırdı (`buildSalePayload` create yolunda da çağrılıyor) ama
 * indirim kutusu `isEdit` kapısının arkasındaydı: satıcı ilanı önce açıp sonra
 * düzenlemeden indirim eklemek zorunda kalıyordu. Bu yüzden güvence EKRANDAN
 * uçtan uca kuruluyor (girdi → handler → submit), yalnız payload üreticisinden değil.
 */
import React from 'react';
import { appAlert } from '@/ui';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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

const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: jest.fn(), patch: jest.fn() },
  productsApi: {
    create: jest.fn(async () => ({ data: {} })),
    update: jest.fn(),
    getMyListings: jest.fn(),
    getMyStats: jest.fn(),
    getMyById: jest.fn(),
    delete: jest.fn(),
  },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  shippingApi: { getPackageTiers: () => mockGet('/shipping/package-tiers') },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: true },
    })),
  },
}));

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      isLoading: false,
      user: { membershipTier: 'free', listingCount: 0 },
      limits: { maxListings: 10, maxImagesPerListing: 5, canTrade: false },
      refreshUserData: jest.fn(async () => {}),
    };
    return sel ? sel(state) : state;
  },
}));

import ListingForm from '../ListingForm';

beforeEach(() => {
  mockGet.mockReset();
  (appAlert as jest.Mock).mockImplementation(() => {});
  mockGet.mockImplementation((url: string) => {
    if (url === '/products/filters') {
      return Promise.resolve({ data: { scales: [], materials: [], brands: [], manufacturers: [] } });
    }
    if (url === '/products/my/stats') {
      return Promise.resolve({
        data: {
          limits: { tierName: 'Free', tierType: 'free' },
          summary: { max: 10, used: 0, remaining: 10, canCreate: true },
        },
      });
    }
    if (url === '/shipping/package-tiers') {
      return Promise.resolve({ data: { tariffVersion: 3, tiers: [] } });
    }
    if (url === '/orders/commission-preview') {
      return Promise.resolve({ data: { sellerFeeAmount: 10, sellerNetAmount: 90 } });
    }
    return Promise.resolve({ data: {} });
  });
});

describe('yeni ilan · indirim girdisi', () => {
  it('oluşturma ekranında indirim alanı GÖRÜNÜR', async () => {
    renderWithProviders(<ListingForm mode="create" />);

    expect(await screen.findByPlaceholderText('İndirim yoksa boş bırakın')).toBeOnTheScreen();
  });

  it('girilen indirim yüzdesi ekranda hesaplanır', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByPlaceholderText('İndirim yoksa boş bırakın');

    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '100');
    fireEvent.changeText(screen.getByPlaceholderText('İndirim yoksa boş bırakın'), '75');

    await waitFor(() => expect(screen.getByText('%25 indirim')).toBeOnTheScreen());
  });
});
