/**
 * Satıcı kargo çıkış adresi kapısı (C-3.3, web `useDispatchAddress`).
 *
 * Adresi ya da geçerli CEP numarası olmayan satıcı yeni ilan açamaz: kargo
 * sözleşmesi göndericiyi zorunlu tutar, aksi halde sipariş sessizce kargosuz
 * kalır. Sabit hat (+9021…) geçerli sayılmaz. Hook `renderHook` ile sürülür
 * (`discountCreate.test.tsx` iskeleti).
 */
import React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
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
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg' }],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockGetAddresses = jest.fn();
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
  addressesApi: { getAll: () => mockGetAddresses() },
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

const GOOD = {
  id: 'a1',
  isDefault: true,
  phone: '+905321234567',
  city: 'İstanbul',
  district: 'Kadıköy',
  address: 'Moda Cd. 1',
};

function fillRequired(f: ReturnType<typeof useListingForm>) {
  f.setTitle('Geçerli başlık');
  f.setDescription('Kutusunda, hiç oynanmamış, boyası kusursuz bir model.');
  f.setPrice('1000');
  f.setCategoryId('c1');
  f.setBrandId('b1');
  f.setMaterial('diecast');
  f.setManufacturerId('m1');
  f.setShippingPackageTier('small');
}

function renderForm() {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useListingForm({ mode: 'create' }), { wrapper: Wrapper });
}

async function submit(addresses: unknown[]) {
  mockGetAddresses.mockResolvedValue({ data: addresses });
  const { result } = renderForm();
  await waitFor(() => expect(result.current.hasBankAccount).toBe(true));
  await waitFor(() => expect(result.current.dispatchAddressLoading).toBe(false));
  act(() => fillRequired(result.current));
  act(() => result.current.toggleColor('blue'));
  act(() => result.current.setIsBoxed('boxed'));
  await act(async () => {
    await result.current.pickImages();
  });
  await waitFor(() => expect(result.current.imageKeys.length).toBe(3));
  await act(async () => {
    await result.current.handleSubmit();
  });
  return result;
}

describe('satıcı kargo çıkış adresi kapısı', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGetAddresses.mockReset();
    wireApi();
    mockPost.mockResolvedValue({
      data: [1, 2, 3].map((n) => ({
        cardKey: `card-${n}`,
        detailKey: `detail-${n}`,
        cardUrl: `https://example.com/card-${n}.jpg`,
        detailUrl: `https://example.com/detail-${n}.jpg`,
      })),
    });
    (productsApi.create as jest.Mock).mockClear();
    (router.push as jest.Mock).mockClear();
    (appAlert as jest.Mock).mockReset();
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  it('adresi olmayan satıcı ilan oluşturamaz; uyarı "Adres Ekle" ile adreslere götürür', async () => {
    const result = await submit([]);

    expect(productsApi.create).not.toHaveBeenCalled();
    expect(result.current.hasDispatchAddress).toBe(false);
    expect(result.current.dispatchAddressNeedsFix).toBe(false);
    const [title, , buttons] = (appAlert as jest.Mock).mock.calls.find(
      (c) => c[0] === 'İlan vermeden önce kargo çıkış adresi eklemelisiniz',
    )!;
    expect(title).toBeTruthy();
    const add = buttons.find((b: any) => b.text === 'Adres Ekle');
    add.onPress();
    expect(router.push).toHaveBeenCalledWith('/settings/addresses');
  });

  it('sabit hat numaralı adres kullanılamaz: "düzelt" denir, ilan açılmaz', async () => {
    const result = await submit([{ ...GOOD, phone: '+902121234567' }]);

    expect(productsApi.create).not.toHaveBeenCalled();
    expect(result.current.dispatchAddressNeedsFix).toBe(true);
    const call = (appAlert as jest.Mock).mock.calls.find(
      (c) => c[0] === 'Kargo çıkış adresinizi düzeltmelisiniz',
    );
    expect(call).toBeTruthy();
    expect(call![2].some((b: any) => b.text === 'Adresi Düzenle')).toBe(true);
  });

  it('geçerli cep numaralı adres varken ilan oluşturulur', async () => {
    await submit([GOOD]);

    expect(productsApi.create).toHaveBeenCalledTimes(1);
    // Oluşturmada seçim yoksa `attributes` alanı hiç gönderilmez (`[]` yalnız düzenlemede).
    expect((productsApi.create as jest.Mock).mock.calls[0][0].attributes).toBeUndefined();
  });

  it('seçim API ile aynı: varsayılan adres varsa o, geçerli olsa bile varsayılan bozuksa kapı kapalı', async () => {
    const result = await submit([
      { ...GOOD, id: 'a2', isDefault: false },
      { ...GOOD, id: 'a3', isDefault: true, address: '  ' },
    ]);

    expect(productsApi.create).not.toHaveBeenCalled();
    expect(result.current.dispatchAddressNeedsFix).toBe(true);
  });
});
