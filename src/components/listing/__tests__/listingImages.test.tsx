/**
 * İlan görselleri — kapak / sıralama / 90° çevirme (`useListingForm`).
 *
 * Sözleşme (web ile aynı): kapak = listenin ilk kalemi; payload `images` dizi sırası
 * = ekrandaki sıra (sunucuda `sortOrder`). Çevirme `POST /media/product-image/rotate`
 * ile YENİ anahtarlar alır; o kalemin anahtarı + önizlemesi değişir, sırası değişmez.
 * Çevirme sürerken gönderim bekletilir (web `imageSubmitBlocker` "pending").
 *
 * Yükleme (web `useListingImageUpload` modeli): seçilen her görsel hemen YEREL önizlemeyle
 * listeye girer, dosya başına ayrı istekle (en fazla 3 paralel) yüklenir; payload yalnız
 * sunucu anahtarlı kalemlerden kurulur, bekleyen/hatalı kalem varken gönderim engellenir,
 * hatalı kalem diğerlerini etkilemez ve yeniden denenebilir; ekran kapanınca istekler iptal.
 *
 * API/mock iskeleti `discountCreate.test.tsx` ile aynı.
 */
import React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { appAlert, toast } from '@/ui';
import { makeTestQueryClient } from '../../../test-utils';
import { pickerAssets, uploadResponder, uploadResponse } from '@/test-utils/listingUpload';

jest.mock('@/hooks/useLegalIdentity', () =>
  require('@/test-utils/legalIdentity').legalIdentityGatePassMock,
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-image-picker', () =>
  jest.requireActual<typeof import('@/test-utils/listingUpload')>('@/test-utils/listingUpload').imagePickerMock(3),
);

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockRotate = jest.fn();
const mockUpload = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a), patch: jest.fn() },
  mediaApi: {
    rotateProductImage: (...a: unknown[]) => mockRotate(...a),
    uploadProductImage: (...a: unknown[]) => mockUpload(...a),
  },
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

async function renderForm() {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useListingForm({ mode: 'create' }), { wrapper: Wrapper });
  const { result } = hook;
  await waitFor(() => expect(result.current.hasBankAccount).toBe(true));
  return hook;
}

/** Zorunlu alanlar dolu, görsel YOK. */
async function renderReadyForm() {
  const hook = await renderForm();
  const { result } = hook;
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
  return hook;
}

/** Zorunlu alanlar dolu + 3 görsel seçilip YÜKLENMİŞ. */
async function renderFilledForm() {
  const hook = await renderReadyForm();
  const { result } = hook;
  await act(async () => {
    await result.current.pickImages();
  });
  await waitFor(() => expect(result.current.imageKeys).toHaveLength(3));
  return hook;
}

/** Elle çözülen yükleme çağrıları (sinyal + ilerleme dahil). */
type UploadCall = {
  file: { uri: string; name: string; type: string };
  signal: AbortSignal;
  onProgress: (p: number) => void;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};
function manualUploads() {
  const calls: UploadCall[] = [];
  mockUpload.mockImplementation(
    (file: UploadCall['file'], opts: { signal: AbortSignal; onProgress: (p: number) => void }) =>
      new Promise((resolve, reject) => {
        calls.push({ file, signal: opts.signal, onProgress: opts.onProgress, resolve, reject });
      }),
  );
  return calls;
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
    mockUpload.mockReset();
    wireApi();
    mockUpload.mockImplementation(uploadResponder());
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
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: pickerAssets(1, 4),
    });
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.imageKeys).toHaveLength(4));
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

describe('ilan görselleri · dosya başına kuyruklu yükleme', () => {
  let toastError: jest.SpyInstance;
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockUpload.mockReset();
    wireApi();
    (productsApi.create as jest.Mock).mockClear();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockClear();
    (appAlert as jest.Mock).mockImplementation(() => undefined);
    toastError = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  });
  afterEach(() => toastError.mockRestore());

  it('seçer seçmez yerel önizleme; bitene kadar payload boş ve gönderim engelli; biten kalem sunucu anahtarına geçer', async () => {
    const calls = manualUploads();
    const { result } = await renderReadyForm();
    await act(async () => {
      await result.current.pickImages();
    });
    // Yanıt beklenmeden üç karo da yerel önizlemeyle listede.
    expect(result.current.images.map((i) => i.uri)).toEqual([
      'file:///tmp/photo-1.jpg',
      'file:///tmp/photo-2.jpg',
      'file:///tmp/photo-3.jpg',
    ]);
    expect(result.current.imageKeys).toEqual([]);
    expect(result.current.uploadingImages).toBe(true);
    await waitFor(() => expect(calls).toHaveLength(3));
    // Dosya başına tek istek, tek dosya.
    expect(calls.map((c) => c.file.name)).toEqual(['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg']);

    act(() => calls[0]!.onProgress(40));
    expect(result.current.images[0]).toMatchObject({ status: 'uploading', progress: 40 });
    act(() => calls[0]!.onProgress(100));
    expect(result.current.images[0]).toMatchObject({ status: 'processing' });

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Görsel yüklemesi sürüyor, lütfen tamamlanmasını bekleyin.');

    await act(async () => {
      calls.forEach((c, i) => c.resolve(uploadResponse(i + 1)));
    });
    await waitFor(() => expect(result.current.imageKeys).toHaveLength(3));
    expect(result.current.uploadingImages).toBe(false);
    expect(result.current.images.map((i) => i.uri)).toEqual([
      'https://example.com/card-1.jpg',
      'https://example.com/card-2.jpg',
      'https://example.com/card-3.jpg',
    ]);
    const sent = await submittedImages(result);
    expect(sent).toEqual([1, 2, 3].map((n) => ({ cardKey: `card-${n}`, detailKey: `detail-${n}` })));
    expect(JSON.stringify(sent)).not.toContain('file://');
  });

  it('eşzamanlılık 3: dördüncü görsel biri bitene kadar sırada; bekleyenler de kontenjandan düşer', async () => {
    const calls = manualUploads();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: pickerAssets(4),
    });
    const { result } = await renderReadyForm();
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(calls).toHaveLength(3);
    expect(result.current.images[3]!.status).toBe('queued');

    await act(async () => {
      calls[0]!.resolve(uploadResponse(1));
    });
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls[3]!.file.name).toBe('photo-4.jpg');

    // 4 kalem (çoğu hâlâ yükleniyor) → kalan kontenjan 1.
    await act(async () => {
      await result.current.pickImages();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectionLimit: 1 }),
    );
  });

  it('hatalı kalem yalnız kendini etkiler: hata metni, gönderim engeli, yeniden dene ya da kaldır', async () => {
    let n = 0;
    mockUpload.mockImplementation(async () => {
      n += 1;
      if (n === 2) throw { response: { data: { message: 'Dosya bozuk' } } };
      return uploadResponse(n);
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: pickerAssets(4),
    });
    const { result } = await renderReadyForm();
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.imageKeys).toHaveLength(3));
    expect(result.current.images.map((i) => i.status)).toEqual(['ready', 'failed', 'ready', 'ready']);
    expect(result.current.images[1]).toMatchObject({ error: 'Dosya bozuk', uri: 'file:///tmp/photo-2.jpg' });
    expect(result.current.imageSubmitBlocker?.reason).toBe('failed');

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Yüklenemeyen görsel var. Tekrar deneyin ya da o görseli kaldırın.');

    // Yeniden dene: aynı yerel dosya tekrar yüklenir, diğerleri dokunulmaz.
    const failedId = result.current.images[1]!.id;
    await act(async () => {
      result.current.retryImage(failedId);
    });
    await waitFor(() => expect(result.current.imageKeys).toHaveLength(4));
    expect(mockUpload).toHaveBeenCalledTimes(5);
    expect(mockUpload.mock.calls[4]![0]).toMatchObject({ name: 'photo-2.jpg' });
    expect(result.current.images[1]).toMatchObject({ id: failedId, cardKey: 'card-5', status: 'ready' });
    expect(result.current.imageSubmitBlocker).toBeNull();
    expect(await submittedImages(result)).toEqual([
      { cardKey: 'card-1', detailKey: 'detail-1' },
      { cardKey: 'card-5', detailKey: 'detail-5' },
      { cardKey: 'card-3', detailKey: 'detail-3' },
      { cardKey: 'card-4', detailKey: 'detail-4' },
    ]);
  });

  it('hatalı kalem kaldırılınca kalanlar gönderilir', async () => {
    let n = 0;
    mockUpload.mockImplementation(async () => {
      n += 1;
      if (n === 1) throw new Error('Network Error');
      return uploadResponse(n);
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: pickerAssets(4),
    });
    const { result } = await renderReadyForm();
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.images[0]!.status).toBe('failed'));
    await waitFor(() => expect(result.current.imageKeys).toHaveLength(3));
    // Sunucu mesajı yoksa yerel metin.
    expect(result.current.images[0]!.error).toBe('Yüklenemedi');
    act(() => result.current.removeImage(result.current.images[0]!.id));
    expect(await submittedImages(result)).toEqual([2, 3, 4].map((k) => ({ cardKey: `card-${k}`, detailKey: `detail-${k}` })));
  });

  it('ekran kapanınca uçuştaki istekler iptal edilir; kaldırılan kalemin isteği de durur', async () => {
    const calls = manualUploads();
    const { result, unmount } = await renderReadyForm();
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(calls).toHaveLength(3));
    act(() => result.current.removeImage(result.current.images[0]!.id));
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(calls[1]!.signal.aborted).toBe(false);
    expect(result.current.images).toHaveLength(2);
    unmount();
    expect(calls.every((c) => c.signal.aborted)).toBe(true);
  });
});
