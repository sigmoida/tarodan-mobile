/**
 * İlan formunda kargo paket boyutu (doküman 14 — hiç uygulanmamıştı).
 *
 * Canlı tarife: small 100 / medium 130 / large 160, `tariffVersion: 3`.
 * Bugün form hiçbir kargo alanı göndermiyor ve `commission-preview`'e kademe
 * geçmiyor → sunucu her ilan için `small` varsayıyor. Büyük bir ürün `small`
 * gidince **paket başına 60 TL eksik tahsil** ediliyor ve satıcıya her zaman
 * en küçük paketin net kazancı gösteriliyor.
 *
 * ⚠️ BAĞLAYICI (doküman 14 §1): mobil arayüzde desi HİÇ görünmez. Kartlarda
 * `billableDesi` / `minDesi` / `maxDesi` render EDİLMEZ.
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
  // Tarife çağrısı da aynı sahte `api.get` üzerinden gitsin ki `wireApi`
  // (503 dalı dahil) tek yerden kontrol edilebilsin.
  shippingApi: { getPackageTiers: () => mockGet('/shipping/package-tiers') },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));
import { productsApi } from '@/lib/api';

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { membershipTier: 'free', listingCount: 0 },
    limits: { maxListings: 10, maxImagesPerListing: 5, canTrade: false },
    refreshUserData: jest.fn(async () => {}),
  }),
}));

import ListingForm from '../ListingForm';

const TARIFF = {
  tariffVersion: 3,
  tiers: [
    { code: 'small', label: 'Küçük Paket', amount: 100, billableDesi: 2, minDesi: 0, maxDesi: 2, sampleWidth: null, sampleHeight: null, sampleLength: null },
    { code: 'medium', label: 'Orta Paket', amount: 130, billableDesi: 5, minDesi: 2, maxDesi: 5, sampleWidth: null, sampleHeight: null, sampleLength: null },
    { code: 'large', label: 'Büyük Paket', amount: 160, billableDesi: 10, minDesi: 5, maxDesi: null, sampleWidth: null, sampleHeight: null, sampleLength: null },
  ],
};

function wireApi(opts: { tiersFail?: boolean } = {}) {
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
      return opts.tiersFail
        ? Promise.reject(new Error('503'))
        : Promise.resolve({ data: TARIFF });
    }
    if (url === '/orders/commission-preview') {
      return Promise.resolve({ data: { sellerFeeAmount: 10, sellerNetAmount: 90 } });
    }
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  mockGet.mockReset();
  (productsApi.create as jest.Mock).mockClear();
  (appAlert as jest.Mock).mockImplementation(() => {});
  wireApi();
});

describe('paket boyutu seçimi', () => {
  it('üç kademeyi de sunucudan gelen etiketiyle gösterir', async () => {
    renderWithProviders(<ListingForm mode="create" />);

    expect(await screen.findByText('Küçük Paket')).toBeOnTheScreen();
    expect(screen.getByText('Orta Paket')).toBeOnTheScreen();
    expect(screen.getByText('Büyük Paket')).toBeOnTheScreen();
  });

  it('desiyi hiçbir kademede göstermez', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('Küçük Paket');

    expect(screen.queryByText(/desi/i)).toBeNull();
  });

  it('hiçbir kademe önseçili gelmez — sunucunun small varsayımı sessizce kabul edilmez', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('Küçük Paket');

    expect(screen.queryByTestId('package-tier-small')).toHaveProp('accessibilityState', { selected: false });
  });

  // Zorunluluk kuralı ve sırası `validate.test.ts`'te: kategori ve fotoğraf
  // kapıları önce geliyor ve ikisi de birim testinde doldurulamıyor (picker
  // modalı + native ImagePicker), o yüzden kural saf fonksiyon üzerinde
  // kilitlendi.

  it('seçim değişince net kazanç önizlemesi o kademeyle yenilenir', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('Büyük Paket');

    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '500');
    fireEvent.press(screen.getByTestId('package-tier-large'));

    await waitFor(
      () =>
        expect(mockGet).toHaveBeenCalledWith(
          '/orders/commission-preview',
          expect.objectContaining({
            params: expect.objectContaining({ packageTier: 'large' }),
          }),
        ),
      { timeout: 3000 },
    );
  });

  it('tarife alınamazsa seçim yaptırmadan gönderime izin vermez', async () => {
    wireApi({ tiersFail: true });
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('İlanı Oluştur');

    fireEvent.changeText(screen.getByPlaceholderText("Örn: Hot Wheels '69 Camaro Z28"), 'Geçerli başlık');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '500');
    fireEvent.press(screen.getByText('İlanı Oluştur'));

    await waitFor(() => expect(productsApi.create).not.toHaveBeenCalled());
  });
});
