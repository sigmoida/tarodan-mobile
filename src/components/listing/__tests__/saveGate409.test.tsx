/**
 * Görsel sözleşmesi — kaydet kapısı ve 409 çakışma (delta 18 §2d, task 5).
 *
 * İki davranış:
 * 1. Görsel yükleme sürerken (`uploadingImages`) kaydet butonu devre dışı;
 *    yükleme bitince tekrar etkin — iki yönü de doğrulanır.
 * 2. Düzenlemede sunucu 409 döndürürse (iyimser kilit / atomik yazım
 *    çakışması) form kaydedilmiş SAYILMAZ: başarı akışına düşülmez, taze
 *    kayıt yeniden çekilir (`getMyById` ikinci kez), kullanıcıya çakışma
 *    mesajı gösterilir.
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
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

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
    ],
    attributes: [],
  },
};

describe('kaydet kapısı — görsel yükleme sürerken', () => {
  let resolveUpload: (v: unknown) => void;

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    wireApi();
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  it('yükleme başlamadan önce kaydet butonu etkindir', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('İlanı Oluştur');

    expect(screen.getByTestId('listing-submit-button')).not.toBeDisabled();
  });

  it('yükleme sürerken kaydet butonu devre dışı kalır, bitince tekrar etkinleşir', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('Görsel yüklemek için dokunun');

    fireEvent.press(screen.getByText('Görsel yüklemek için dokunun'));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('listing-submit-button')).toBeDisabled());

    // Kilitliyken basmak submit'i tetiklemez — yarım images[] gönderilmez.
    fireEvent.press(screen.getByTestId('listing-submit-button'));
    expect(productsApi.create).not.toHaveBeenCalled();

    // `act` ile sarmalamak (React 19 + react-test-renderer'ın bu ortamdaki
    // kombinasyonunda) `resolveUpload`'ın kuyruğa aldığı state güncellemesini
    // hiç flush ETMEYİP `waitFor` sonsuz döngüsünde asılı kalmasına yol
    // açıyor; `waitFor`'un kendi polling'i zaten `act` ile flush ediyor —
    // burada sarmalamamak doğru davranışı (buton yeniden etkinleşir) verir.
    resolveUpload({
      data: [
        {
          cardKey: 'ck-1',
          detailKey: 'dk-1',
          cardUrl: 'https://example.com/card.jpg',
          detailUrl: 'https://example.com/detail.jpg',
        },
      ],
    });

    await waitFor(() => expect(screen.getByTestId('listing-submit-button')).not.toBeDisabled());
  });
});

describe('409 — düzenlemede yazım çakışması', () => {
  let alertSpy: jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    wireApi();
    alertSpy = (appAlert as jest.Mock).mockImplementation(() => {});
    (productsApi.getMyById as jest.Mock).mockReset();
    (productsApi.getMyById as jest.Mock).mockResolvedValue({ data: { data: EDIT_PROJECTION } });
    (productsApi.update as jest.Mock).mockReset();
    (productsApi.update as jest.Mock).mockRejectedValue({ response: { status: 409 } });
  });

  it('başarı akışına düşmez, taze kaydı yeniden çeker ve çakışmayı bildirir', async () => {
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    expect(productsApi.getMyById).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Hata',
        'Bu ilan başka bir yerden güncellendi. En güncel hali yüklendi, değişikliklerinizi tekrar uygulayın.',
      ),
    );

    // (a) başarı mesajı/yönlendirmesi hiç çıkmadı.
    expect(alertSpy).not.toHaveBeenCalledWith('Başarılı', 'İlan güncellendi!', expect.anything());
    // (b) taze kayıt yeniden çekildi — prefill (1) + 409 sonrası (2).
    expect(productsApi.getMyById).toHaveBeenCalledTimes(2);
  });
});
