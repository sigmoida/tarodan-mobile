/**
 * Oluşturmada indirim — `POST /products` de artık indirim alanlarını kabul
 * ediyor (delta 18 §2b, task 6). Mantık düzenlemeden ortak `buildSalePayload`
 * yardımcısına taşındı; bu test onun `create` dalında da çağrıldığını, gerçek
 * indirim değerleriyle, doğrular — yalnız `null` alanların gittiğini
 * doğrulayan (indirim hiç gönderilmese de geçecek) zayıf bir test DEĞİL.
 *
 * İndirim kutusu bugün yalnız düzenleme ekranında render ediliyor (ekran bu
 * turun kapsamı dışında), o yüzden hook doğrudan `renderHook` ile sürülüyor —
 * `packageTier.test.tsx` / `saveGate409.test.tsx` ile aynı API/mock iskeleti,
 * aynı görsel-yükleme akışı (`pickImages`).
 */
import React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { makeTestQueryClient } from '../../../test-utils';

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

// `user`/`limits` module düzeyinde SABİT — mock içinde her çağrıda yeni
// obje döndürülürse `[user, limits]`'e bağımlı effect (useListingForm.ts:222)
// her render'da referans değişikliği görüp sonsuz döngüye girer. Gerçek
// zustand store referansları sabit tutar; mock da öyle davranmalı.
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

import { useListingForm } from '../_hooks/useListingForm';

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

function renderForm() {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useListingForm({ mode: 'create' }), { wrapper: Wrapper });
}

describe('oluşturmada indirim payload', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    wireApi();
    mockPost.mockResolvedValue({
      data: [
        {
          cardKey: 'card-1',
          detailKey: 'detail-1',
          cardUrl: 'https://example.com/card-1.jpg',
          detailUrl: 'https://example.com/detail-1.jpg',
        },
      ],
    });
    (productsApi.create as jest.Mock).mockClear();
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  it('indirim alanları gerçek değerleriyle create çağrısına girer', async () => {
    const { result } = renderForm();

    // `listingLimits` yalnız gerçekten dolduğunda gönderimi bloklar (bkz.
    // `handleSubmit`); null iken kapı açık kalır, o yüzden burada onun
    // dolmasını beklemeye gerek yok — yalnız banka hesabı kapısı beklenir.
    await waitFor(() => expect(result.current.hasBankAccount).toBe(true));

    act(() => {
      result.current.setTitle('Geçerli başlık');
      result.current.setPrice('1000');
      result.current.setCategoryId('c1');
      result.current.setShippingPackageTier('small');
      result.current.setSalePrice('800');
      result.current.setSaleStartDate('2026-08-10');
      result.current.setSaleEndDate('2026-08-20');
    });

    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.imageKeys.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(productsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalPrice: 1000,
        salePrice: 800,
        saleStartDate: new Date('2026-08-10').toISOString(),
        saleEndDate: new Date('2026-08-20').toISOString(),
      }),
    );
  });
});
