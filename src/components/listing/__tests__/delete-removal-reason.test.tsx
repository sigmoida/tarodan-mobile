/**
 * Parite C-3.2 · düzenleme ekranında silme: onay metni yerine kaldırma nedeni
 * penceresi açılır; neden DELETE gövdesinde gider (web ile aynı kural).
 */
import React from 'react';
import { appAlert } from '@/ui';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

/** `alertAfterClose` aynı modülden `appAlert` import eder: kaynakta da casusla. */
jest.mock('@/ui/components/AlertDialog', () => ({
  ...jest.requireActual('@/ui/components/AlertDialog'),
  appAlert: jest.fn(),
}));
const sourceAlert = () => (jest.requireMock('@/ui/components/AlertDialog') as { appAlert: jest.Mock }).appAlert;

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: (...a: any[]) => mockPost(...a), patch: jest.fn() },
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
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));
import { productsApi } from '@/lib/api';

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

const TARIFF = {
  tariffVersion: 3,
  tiers: [
    { code: 'small', label: 'Küçük Paket', amount: 100, billableDesi: 2, minDesi: 0, maxDesi: 2, sampleWidth: null, sampleHeight: null, sampleLength: null },
  ],
};

function wireApi() {
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
      return Promise.resolve({ data: TARIFF });
    }
    if (url === '/orders/commission-preview') {
      return Promise.resolve({ data: { sellerFeeAmount: 10, sellerNetAmount: 90 } });
    }
    return Promise.resolve({ data: {} });
  });
}

const EDIT_PROJECTION = {
  quantity: 1,
  availableQuantity: 1,
  isPreorder: false,
  edit: {
    title: 'Geçerli başlık',
    description: '',
    price: 500,
    oldPrice: null,
    salePrice: null,
    saleStartDate: null,
    saleEndDate: null,
    categoryId: 'c1',
    brandId: null,
    carModelId: null,
    manufacturerId: null,
    condition: 'very_good',
    status: 'active',
    modelCode: '',
    color: null,
    isBoxed: null,
    quantity: 1,
    maxQuantityPerOrder: null,
    shippingPackageTier: 'small',
    isTradeEnabled: false,
    isSet: false,
    bundleSize: null,
    isLimited: false,
    editionNumber: null,
    editionTotal: null,
    releaseDate: null,
    year: null,
    images: [
      {
        cardKey: 'card-1',
        detailKey: 'detail-1',
        cardUrl: 'https://example.com/card-1.jpg',
        detailUrl: 'https://example.com/detail-1.jpg',
        sortOrder: 0,
      },
      {
        cardKey: 'card-2',
        detailKey: 'detail-2',
        cardUrl: 'https://example.com/card-2.jpg',
        detailUrl: 'https://example.com/detail-2.jpg',
        sortOrder: 1,
      },
      {
        cardKey: 'card-3',
        detailKey: 'detail-3',
        cardUrl: 'https://example.com/card-3.jpg',
        detailUrl: 'https://example.com/detail-3.jpg',
        sortOrder: 2,
      },
    ],
    attributes: [],
  },
};

describe('düzenleme ekranı — silme nedeni', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    wireApi();
    (appAlert as jest.Mock).mockImplementation(() => {});
    (productsApi.getMyById as jest.Mock).mockReset();
    (productsApi.getMyById as jest.Mock).mockResolvedValue({ data: { data: EDIT_PROJECTION } });
    (productsApi.delete as jest.Mock).mockReset();
    (productsApi.delete as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('silme önce nedeni sorar; neden seçilmeden DELETE gitmez, seçilince gövdede gider', async () => {
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    fireEvent.press(screen.getAllByText('İlanı Sil')[0]);
    // Eski düz onay uyarısı (appAlert) açılmaz — pencerenin kendisi onaydır.
    expect(appAlert).not.toHaveBeenCalled();
    await screen.findByText('Evet, Sil');

    fireEvent.press(screen.getByText('Evet, Sil'));
    expect(productsApi.delete).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Vazgeçtim'));
    fireEvent.press(screen.getByText('Evet, Sil'));
    await waitFor(() =>
      expect(productsApi.delete).toHaveBeenCalledWith('p1', { removalReason: 'changed_mind' }),
    );
    // Başarı uyarısı pencere kapandıktan sonra gelir; bekle ki zamanlayıcı testten taşmasın.
    await waitFor(() => expect(sourceAlert()).toHaveBeenCalledWith('Silindi', 'İlan silindi', expect.any(Array)));
  });

  describe('iOS ModalFreeze: uyarı pencere kapandıktan sonra', () => {
    afterEach(() => jest.useRealTimers());

    async function submitDelete() {
      renderWithProviders(<ListingForm mode="edit" productId="p1" />);
      await screen.findByText('Değişiklikleri Kaydet');
      fireEvent.press(screen.getAllByText('İlanı Sil')[0]);
      await screen.findByText('Evet, Sil');
      fireEvent.press(screen.getByText('Vazgeçtim'));
      sourceAlert().mockReset();
      jest.useFakeTimers();
      fireEvent.press(screen.getByText('Evet, Sil'));
    }

    it('hızlı hata yanıtı: kapanış süresi dolmadan appAlert çıkmaz', async () => {
      (productsApi.delete as jest.Mock).mockRejectedValue({ response: { data: { message: 'Silinemedi' } } });
      await submitDelete();
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      expect(sourceAlert()).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(450);
      });
      expect(sourceAlert()).toHaveBeenCalledWith('Hata', 'Silinemedi', undefined);
    });
  });
});
