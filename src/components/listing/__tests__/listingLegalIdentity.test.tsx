/**
 * B4 · İlan verme (`useListingForm.handleSubmit`, oluşturma) yasal kimlik
 * kapısından geçer. Kapı form/banka/adres/limit kontrollerinden SONRA,
 * `productsApi.create`'ten ÖNCE. Düzenlemede sorulmaz (bkz.
 * `saveGate409.test.tsx`).
 *
 * Gerçek `ensureLegalIdentity` + istek store'u; API/mock iskeleti
 * `discountCreate.test.tsx` ile aynı.
 */
import React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { makeTestQueryClient } from '../../../test-utils';
import { MISSING_LEGAL_IDENTITY } from '@/test-utils/legalIdentity';

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
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  productsApi: {
    create: jest.fn(async () => ({ data: {} })),
    update: jest.fn(),
    getMyListings: jest.fn(),
    getMyStats: jest.fn(),
    getMyById: jest.fn(),
    delete: jest.fn(),
  },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: {
    getAll: jest.fn(async () => ({
      data: [{ id: 'a1', isDefault: true, phone: '+905321234567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cd. 1' }],
    })),
  },
  shippingApi: {
    getPackageTiers: () =>
      Promise.resolve({
        data: {
          tariffVersion: 3,
          tiers: [{ code: 'small', label: 'Küçük Paket', amount: 100, billableDesi: 2, minDesi: 0, maxDesi: 2 }],
        },
      }),
  },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));

// Sabit referanslar (bkz. discountCreate: `[user, limits]` effect döngüsü).
// `getState` gerçek `ensureLegalIdentity` için — aynı sabit durum.
const mockAuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: { membershipTier: 'free', listingCount: 0 },
  limits: { maxListings: 10, maxImagesPerListing: 5, canTrade: false },
  refreshUserData: jest.fn(async () => {}),
};
jest.mock('../../../stores/authStore', () => {
  const useAuthStore: any = (sel?: (state: any) => unknown) => (sel ? sel(mockAuthState) : mockAuthState);
  useAuthStore.getState = () => mockAuthState;
  return { useAuthStore };
});

import { legalIdentityApi, productsApi } from '@/lib/api';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import { useListingForm } from '../_hooks/useListingForm';

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
    return Promise.resolve({ data: {} });
  });
  mockPost.mockResolvedValue({
    data: [1, 2, 3].map((n) => ({
      cardKey: `card-${n}`,
      detailKey: `detail-${n}`,
      cardUrl: `https://example.com/card-${n}.jpg`,
      detailUrl: `https://example.com/detail-${n}.jpg`,
    })),
  });
}

async function renderFilledForm() {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useListingForm({ mode: 'create' }), { wrapper: Wrapper });
  const { result } = hook;
  await waitFor(() => expect(result.current.hasBankAccount).toBe(true));
  act(() => {
    const f = result.current;
    f.setTitle('Geçerli başlık');
    f.setDescription('Kutusunda, hiç oynanmamış, boyası kusursuz bir model.');
    f.setPrice('1000');
    f.setCategoryId('c1');
    f.setBrandId('b1');
    f.setMaterial('diecast');
    f.setManufacturerId('m1');
    f.setShippingPackageTier('small');
  });
  act(() => result.current.toggleColor('blue'));
  act(() => result.current.setIsBoxed('boxed'));
  await act(async () => {
    await result.current.pickImages();
  });
  await waitFor(() => expect(result.current.imageKeys.length).toBe(3));
  return hook;
}

const gateOpened = () =>
  waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

describe('İlan verme · yasal kimlik kapısı', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    wireApi();
    (productsApi.create as jest.Mock).mockClear();
    (legalIdentityApi.getStatus as jest.Mock).mockReset().mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => act(() => settleLegalIdentityRequest(false)));

  it('kimlik eksik → kapı açılır, ilan gitmez; kaydedilince ilan oluşturulur', async () => {
    const { result } = await renderFilledForm();
    act(() => {
      void result.current.handleSubmit();
    });

    await gateOpened();
    expect(productsApi.create).not.toHaveBeenCalled();

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() =>
      expect(productsApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Geçerli başlık' })),
    );
  });

  it('Vazgeç → ilan oluşturulmaz, form gönderiliyor durumuna geçmez', async () => {
    const { result } = await renderFilledForm();
    act(() => {
      void result.current.handleSubmit();
    });

    await gateOpened();
    await act(async () => settleLegalIdentityRequest(false));
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('form geçersizse kimlik sorulmaz', async () => {
    const queryClient = makeTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useListingForm({ mode: 'create' }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hasBankAccount).toBe(true));

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(legalIdentityApi.getStatus).not.toHaveBeenCalled();
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});
