/**
 * İlan görseli — hazırlanmış dosyanın yaşam döngüsü (yükleme backlog'u):
 * - geçici hatadan (ağ/5xx/408/429) sonra yeniden denemede görsel İKİNCİ KEZ küçültülmez
 *   (hazırlanmış dosya kalemde saklı); 4xx sonrası ya da dosya diskte yoksa orijinalden yeniden
 *   hazırlanır;
 * - hazırlanmış geçici dosya yükleme başarılı olunca / kalem kaldırılınca / ekran kapanınca silinir;
 * - picker'ın orijinal dosyasına hiç dokunulmaz;
 * - picker `pickerQuality()` ile açılır.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () =>
  jest.requireActual<typeof import('@/test-utils/listingUpload')>('@/test-utils/listingUpload').imagePickerMock(2),
);
const mockDelete = jest.fn(async (_uri: string, _opts?: unknown) => undefined);
const mockGetInfo = jest.fn(async (_uri: string): Promise<{ exists: boolean }> => ({ exists: true }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: (uri: string, opts?: unknown) => mockDelete(uri, opts),
  getInfoAsync: (uri: string) => mockGetInfo(uri),
}));
jest.mock('@/lib/api', () => ({ mediaApi: { uploadProductImage: jest.fn(), rotateProductImage: jest.fn() } }));

import { useListingImageUpload } from '../_hooks/useListingImageUpload';
import type { UploadPort } from '../_lib/uploadQueue';
import { pickerQuality, type ImagePreparer, type LocalImageFile } from '@/lib/media';

const preparedUri = (f: LocalImageFile) => `file:///cache/ImageManipulator/${f.name}`;
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(uploadImpl: (file: LocalImageFile) => Promise<{ cardKey: string; detailKey: string }>) {
  const prepare = jest.fn<ReturnType<ImagePreparer>, Parameters<ImagePreparer>>(async (f) => ({
    ...f,
    uri: preparedUri(f),
    type: 'image/jpeg',
    temporary: true,
  }));
  const upload = jest.fn<ReturnType<UploadPort>, Parameters<UploadPort>>((file) => uploadImpl(file));
  const hook = renderHook(() => useListingImageUpload({ maxImages: 5, upload, prepare }));
  return { ...hook, prepare, upload };
}

beforeEach(() => {
  mockDelete.mockClear();
  mockGetInfo.mockReset();
  mockGetInfo.mockResolvedValue({ exists: true });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockClear();
});

describe('useListingImageUpload — hazırlanmış dosya', () => {
  it('picker kaliteyi tek karar noktasından (pickerQuality) alır', async () => {
    const { result } = setup(async () => ({ cardKey: 'c', detailKey: 'd' }));
    await act(async () => {
      await result.current.pickImages();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ quality: pickerQuality() }),
    );
  });

  it('yeniden deneme hazırlanmış dosyayı kullanır (ikinci küçültme yok); başarıda geçici dosya silinir', async () => {
    let attempt = 0;
    const { result, prepare, upload } = setup(async (file) => {
      attempt += 1;
      // İlk görselin ilk denemesi düşer.
      if (file.name === 'photo-1.jpg' && attempt === 1) throw new Error('network');
      return { cardKey: `card-${file.name}`, detailKey: `detail-${file.name}` };
    });
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.images[0]!.status).toBe('failed'));
    const failed = result.current.images[0]!;
    expect(failed.preparedFile?.uri).toBe('file:///cache/ImageManipulator/photo-1.jpg');
    expect(prepare).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.retryImage(failed.id);
    });
    await waitFor(() => expect(result.current.images[0]!.status).toBe('ready'));
    // Yeniden deneme: hazırlama YOK, aynı hazırlanmış dosya yüklenir.
    expect(prepare).toHaveBeenCalledTimes(2);
    const photo1Uploads = upload.mock.calls.filter(([f]) => f.name === 'photo-1.jpg').map(([f]) => f.uri);
    expect(photo1Uploads).toEqual([
      'file:///cache/ImageManipulator/photo-1.jpg',
      'file:///cache/ImageManipulator/photo-1.jpg',
    ]);
    // Biten kalem dosyayı bırakır; ikisinin de geçici dosyası silinir, orijinale dokunulmaz.
    expect(result.current.images.every((item) => !item.preparedFile)).toBe(true);
    await flush();
    const deleted = mockDelete.mock.calls.map(([uri]) => uri);
    expect(deleted).toEqual(
      expect.arrayContaining([
        'file:///cache/ImageManipulator/photo-1.jpg',
        'file:///cache/ImageManipulator/photo-2.jpg',
      ]),
    );
    expect(deleted.some((uri) => uri.startsWith('file:///tmp/'))).toBe(false);
  });

  it('hatalı kalem kaldırılınca hazırlanmış dosyası silinir', async () => {
    const { result } = setup(async () => {
      throw new Error('network');
    });
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.images.every((i) => i.status === 'failed')).toBe(true));
    const id = result.current.images[0]!.id;
    act(() => result.current.removeImage(id));
    await flush();
    expect(mockDelete.mock.calls.map(([uri]) => uri)).toEqual(['file:///cache/ImageManipulator/photo-1.jpg']);
  });

  it('ekran kapanınca kalan hazırlanmış dosyalar silinir', async () => {
    const { result, unmount } = setup(async () => {
      throw new Error('network');
    });
    await act(async () => {
      await result.current.pickImages();
    });
    await waitFor(() => expect(result.current.images.every((i) => i.status === 'failed')).toBe(true));
    unmount();
    await flush();
    expect(mockDelete.mock.calls.map(([uri]) => uri).sort()).toEqual([
      'file:///cache/ImageManipulator/photo-1.jpg',
      'file:///cache/ImageManipulator/photo-2.jpg',
    ]);
  });

  /** İlk görselin ilk denemesi `firstError` ile düşer; sonra hepsi başarılı. */
  async function failFirstThenRetry(firstError: unknown, beforeRetry?: () => void) {
    let attempt = 0;
    const ctx = setup(async (file) => {
      attempt += 1;
      if (file.name === 'photo-1.jpg' && attempt === 1) throw firstError;
      return { cardKey: `card-${file.name}`, detailKey: `detail-${file.name}` };
    });
    await act(async () => {
      await ctx.result.current.pickImages();
    });
    await waitFor(() => expect(ctx.result.current.images[0]!.status).toBe('failed'));
    beforeRetry?.();
    await act(async () => {
      ctx.result.current.retryImage(ctx.result.current.images[0]!.id);
    });
    await waitFor(() => expect(ctx.result.current.images[0]!.status).toBe('ready'));
    return ctx;
  }
  const preparedPhoto1 = (prepare: jest.Mock) => prepare.mock.calls.filter(([f]) => f.name === 'photo-1.jpg');

  it.each([
    ['5xx', { response: { status: 503 } }],
    ['408', { response: { status: 408 } }],
    ['429', { response: { status: 429 } }],
  ])('%s sonrası yeniden deneme hazırlanmış dosyayı kullanır', async (_label, error) => {
    const { prepare } = await failFirstThenRetry(error);
    expect(preparedPhoto1(prepare)).toHaveLength(1);
  });

  it('4xx sonrası hazırlanmış dosya bırakılır (silinir), yeniden deneme orijinalden yeniden hazırlar', async () => {
    const { prepare, upload } = await failFirstThenRetry({ response: { status: 400 } });
    expect(preparedPhoto1(prepare)).toHaveLength(2);
    // İkinci hazırlama orijinalden (picker URI'si).
    expect(preparedPhoto1(prepare)[1]![0].uri).toBe('file:///tmp/photo-1.jpg');
    expect(upload.mock.calls.filter(([f]) => f.name === 'photo-1.jpg')).toHaveLength(2);
    await flush();
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/ImageManipulator/photo-1.jpg', { idempotent: true });
  });

  it('hazırlanmış dosya diskte yoksa (cache temizlendi) orijinalden yeniden hazırlanır', async () => {
    const { prepare } = await failFirstThenRetry(new Error('network'), () => {
      mockGetInfo.mockResolvedValueOnce({ exists: false });
    });
    expect(preparedPhoto1(prepare)).toHaveLength(2);
  });
});
