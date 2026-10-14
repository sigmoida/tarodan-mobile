/**
 * İlan görselleri — kapak / sıralama / 90° çevirme (`useListingForm`).
 *
 * Sözleşme (web ile aynı): kapak = listenin ilk kalemi; payload `images` dizi sırası
 * = ekrandaki sıra (sunucuda `sortOrder`). Çevirme `POST /media/product-image/rotate`
 * ile YENİ anahtarlar alır; o kalemin anahtarı + önizlemesi değişir, sırası değişmez.
 * Çevirme sürerken gönderim bekletilir (web `imageSubmitBlocker` "pending").
 *
 * API/mock iskeleti `discountCreate.test.tsx` ile aynı.
 */
import React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appAlert, toast } from '@/ui';
import { makeTestQueryClient } from '../../../test-utils';

jest.mock('@/hooks/useLegalIdentity', () =>
  require('@/test-utils/legalIdentity').legalIdentityGatePassMock,
);

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
const mockRotate = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a), patch: jest.fn() },
  mediaApi: { rotateProductImage: (...a: unknown[]) => mockRotate(...a) },
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
  shippingApi: { getPackageTiers: () => mockGet('/shipping/package-tiers') },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));
import { productsApi } from '@/lib/api';

const mockAuthUser = { membershipTier: 'free', listingCount: 0 };
const mockAuthLimits = { maxListings: 10, maxImagesPerListing: 5, canTrade: false };
const mockRefreshUserData = jest.fn(async () => undefined);
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: unknown) => unknown) => {
    const state = {
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
    if (url === '/shipping/package-tiers') return Promise.resolve({ data: TARIFF });
    if (url === '/orders/commission-preview') {
      return Promise.resolve({ data: { sellerFeeAmount: 10, sellerNetAmount: 90 } });
    }
    return Promise.resolve({ data: {} });
  });
}

type Form = ReturnType<typeof useListingForm>;

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
  await waitFor(() => expect(result.current.images).toHaveLength(3));
  return hook;
}

const cardKeys = (f: Form) => f.images.map((i) => i.cardKey);

async function submittedImages(result: { current: Form }) {
  await act(async () => {
    await result.current.handleSubmit();
  });
  expect(productsApi.create).toHaveBeenCalledTimes(1);
  return (productsApi.create as jest.Mock).mock.calls[0]![0].images;
}

describe('ilan görselleri · kapak / sıralama / çevirme', () => {
  let toastError: jest.SpyInstance;
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockRotate.mockReset();
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
    (appAlert as jest.Mock).mockImplementation(() => undefined);
    toastError = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  });
  afterEach(() => toastError.mockRestore());

  it('yüklenen her görsel kararlı, benzersiz kimlik alır; önizleme API URL\'si', async () => {
    const { result } = await renderFilledForm();
    const ids = result.current.images.map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
    expect(result.current.images.map((i) => i.uri)).toEqual([
      'https://example.com/card-1.jpg',
      'https://example.com/card-2.jpg',
      'https://example.com/card-3.jpg',
    ]);
  });

  it('kapak yap + taşı + kaldır → payload sırası ekrandaki sıra (ilk = kapak)', async () => {
    const { result } = await renderFilledForm();
    const [a, b, c] = result.current.images.map((i) => i.id) as [string, string, string];
    act(() => result.current.makeCoverImage(c));
    expect(cardKeys(result.current)).toEqual(['card-3', 'card-1', 'card-2']);
    act(() => result.current.moveImage(a, 2));
    expect(cardKeys(result.current)).toEqual(['card-3', 'card-2', 'card-1']);
    act(() => result.current.shiftImage(b, -1));
    expect(cardKeys(result.current)).toEqual(['card-2', 'card-3', 'card-1']);
    act(() => result.current.shiftImage(b, 1));
    expect(cardKeys(result.current)).toEqual(['card-3', 'card-2', 'card-1']);

    // 4. görsel eklenip kaldırılır — kimlikten silme, diğerlerinin sırası korunur.
    mockPost.mockResolvedValueOnce({
      data: [{ cardKey: 'card-4', detailKey: 'detail-4', cardUrl: 'https://example.com/card-4.jpg' }],
    });
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.images).toHaveLength(4));
    const second = result.current.images[1]!.id;
    act(() => result.current.removeImage(second));
    expect(cardKeys(result.current)).toEqual(['card-3', 'card-1', 'card-4']);

    expect(await submittedImages(result)).toEqual([
      { cardKey: 'card-3', detailKey: 'detail-3' },
      { cardKey: 'card-1', detailKey: 'detail-1' },
      { cardKey: 'card-4', detailKey: 'detail-4' },
    ]);
  });

  it('çevir: yeni anahtar + önizleme aynı konumda; çift dokunuş tek istek', async () => {
    const { result } = await renderFilledForm();
    let resolveRotate!: (v: unknown) => void;
    mockRotate.mockReturnValueOnce(new Promise((r) => (resolveRotate = r)));
    const target = result.current.images[1]!;

    let first!: Promise<void>;
    act(() => {
      first = result.current.rotateImage(target.id);
      void result.current.rotateImage(target.id);
    });
    expect(mockRotate).toHaveBeenCalledTimes(1);
    expect(mockRotate).toHaveBeenCalledWith('detail-2');
    expect(result.current.images[1]!.status).toBe('rotating');

    await act(async () => {
      resolveRotate({
        data: {
          cardKey: 'card-2r',
          detailKey: 'detail-2r',
          cardUrl: 'https://example.com/card-2r.webp',
          detailUrl: 'https://example.com/detail-2r.webp',
        },
      });
      await first;
    });
    expect(result.current.images[1]).toMatchObject({
      id: target.id,
      cardKey: 'card-2r',
      detailKey: 'detail-2r',
      uri: 'https://example.com/card-2r.webp',
      status: 'ready',
    });
    expect(await submittedImages(result)).toEqual([
      { cardKey: 'card-1', detailKey: 'detail-1' },
      { cardKey: 'card-2r', detailKey: 'detail-2r' },
      { cardKey: 'card-3', detailKey: 'detail-3' },
    ]);
  });

  it('görsel sayısı 2\'nin altına inince sürükleme kilidi kalkar (bitiş bildirimi gelmese de)', async () => {
    const { result } = await renderFilledForm();
    act(() => result.current.setImageDragActive(true));
    expect(result.current.imageDragActive).toBe(true);
    act(() => result.current.removeImage(result.current.images[0]!.id));
    expect(result.current.imageDragActive).toBe(true);
    act(() => result.current.removeImage(result.current.images[0]!.id));
    await waitFor(() => expect(result.current.imageDragActive).toBe(false));
  });

  it('çevirme hatası: kalem aynen kalır, hata toast\'ı (web rotateFailed)', async () => {
    const { result } = await renderFilledForm();
    mockRotate.mockRejectedValueOnce(new Error('boom'));
    const before = result.current.images[0]!;
    await act(async () => {
      await result.current.rotateImage(before.id);
    });
    expect(result.current.images[0]).toEqual(before);
    expect(toastError).toHaveBeenCalledWith('Görsel çevrilemedi');
  });

  it('çevirme sürerken gönderim bekletilir (eski anahtarla ilan gitmez)', async () => {
    const { result } = await renderFilledForm();
    mockRotate.mockReturnValueOnce(new Promise(() => undefined));
    act(() => {
      void result.current.rotateImage(result.current.images[0]!.id);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Görsel yüklemesi sürüyor, lütfen tamamlanmasını bekleyin.');
  });
});
