import { requireOptionalNativeModule } from 'expo';

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn(() => null) }));
const mockDelete = jest.fn(async (_uri: string, _opts?: unknown) => undefined);
const mockGetInfo = jest.fn(async (_uri: string): Promise<{ exists: boolean }> => ({ exists: true }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: (uri: string, opts?: unknown) => mockDelete(uri, opts),
  getInfoAsync: (uri: string) => mockGetInfo(uri),
}));

import {
  PICKER_QUALITY,
  abortError,
  canReusePreparedFile,
  fromPickerAsset,
  isAbortError,
  isDisposablePreparedFile,
  pickerQuality,
  preparedFileExists,
  releasePreparedFile,
  untilAborted,
  withPreparedImage,
  type ImageManipulatorLike,
  type LocalImageFile,
} from '@/lib/media';
import type { ImagePickerAsset } from 'expo-image-picker';

const mockRequire = requireOptionalNativeModule as jest.Mock;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockDelete.mockClear();
  mockRequire.mockReset();
  mockRequire.mockReturnValue(null);
});

describe('pickerQuality (tek karar noktası)', () => {
  it('manipulator olsa da olmasa da 0.8 — hazırlama atlanırsa güvenlik ağı (JPEG, EXIF/GPS yok)', () => {
    expect(PICKER_QUALITY).toBe(0.8);
    expect(pickerQuality()).toBe(0.8);
    mockRequire.mockReturnValue({ manipulate: jest.fn() });
    expect(pickerQuality()).toBe(0.8);
  });
});

describe('canReusePreparedFile (yeniden deneme kuralı)', () => {
  it('geçici hata: ağ / yanıt yok, 5xx, 408, 429 → yeniden kullan', () => {
    expect(canReusePreparedFile(new Error('Network Error'))).toBe(true);
    expect(canReusePreparedFile(undefined)).toBe(true);
    expect(canReusePreparedFile({ response: { status: 500 } })).toBe(true);
    expect(canReusePreparedFile({ response: { status: 503 } })).toBe(true);
    expect(canReusePreparedFile({ response: { status: 408 } })).toBe(true);
    expect(canReusePreparedFile({ response: { status: 429 } })).toBe(true);
  });

  it('diğer 4xx → bırak, orijinalden yeniden hazırla', () => {
    expect(canReusePreparedFile({ response: { status: 400 } })).toBe(false);
    expect(canReusePreparedFile({ response: { status: 413 } })).toBe(false);
    expect(canReusePreparedFile({ response: { status: 422 } })).toBe(false);
  });
});

describe('preparedFileExists', () => {
  const f: LocalImageFile = { uri: 'file:///cache/ImageManipulator/a.jpg', name: 'a.jpg', type: 'image/jpeg' };
  it('diskte varsa true, yoksa / kontrol hata verirse false', async () => {
    await expect(preparedFileExists(f)).resolves.toBe(true);
    mockGetInfo.mockResolvedValueOnce({ exists: false });
    await expect(preparedFileExists(f)).resolves.toBe(false);
    mockGetInfo.mockRejectedValueOnce(new Error('io'));
    await expect(preparedFileExists(f)).resolves.toBe(false);
  });
});

describe('releasePreparedFile (yalnız hazırlayıcının cache dosyası)', () => {
  const prepared: LocalImageFile = {
    uri: 'file:///cache/ImageManipulator/a.jpg',
    name: 'a.jpg',
    type: 'image/jpeg',
    temporary: true,
  };

  it('hazırlanmış geçici dosya silinir', async () => {
    releasePreparedFile(prepared);
    await flush();
    expect(mockDelete).toHaveBeenCalledWith(prepared.uri, { idempotent: true });
  });

  it("picker'ın orijinaline (işaretsiz) dokunulmaz — cache'te olsa bile", async () => {
    releasePreparedFile({ uri: 'file:///cache/ImagePicker/orig.jpg', name: 'orig.jpg', type: 'image/jpeg' });
    releasePreparedFile(null);
    releasePreparedFile(undefined);
    await flush();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('cache dışındaki dosya işaretli olsa da silinmez', () => {
    expect(isDisposablePreparedFile({ ...prepared, uri: 'file:///DCIM/a.jpg' })).toBe(false);
  });

  it('silme hatası yutulur', async () => {
    mockDelete.mockRejectedValueOnce(new Error('EPERM'));
    expect(() => releasePreparedFile(prepared)).not.toThrow();
    await flush();
  });
});

describe('withPreparedImage', () => {
  const original: LocalImageFile = {
    uri: 'file:///photos/IMG.HEIC',
    name: 'IMG.HEIC',
    type: 'image/heic',
    width: 4032,
    height: 3024,
  };

  /** Sahte manipulator: her işlemde cache'e bir JPEG yazar. */
  const fakeManipulator = (): ImageManipulatorLike => ({
    manipulate: jest.fn(() => {
      const ctx: ReturnType<ImageManipulatorLike['manipulate']> = {
        resize: jest.fn(() => ctx),
        renderAsync: jest.fn(async () => ({
          width: 1600,
          height: 1200,
          saveAsync: jest.fn(async () => ({ uri: 'file:///cache/ImageManipulator/out.jpg' })),
        })),
      };
      return ctx;
    }),
  });

  it('hazırlanmış dosyayı yükler, sonra geçici dosyayı siler (başarı)', async () => {
    mockRequire.mockReturnValue(fakeManipulator());
    const upload = jest.fn(async (f: LocalImageFile) => f.uri);
    await expect(withPreparedImage(original, upload)).resolves.toBe('file:///cache/ImageManipulator/out.jpg');
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/jpeg', name: 'IMG.jpg', temporary: true }),
    );
    await flush();
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/ImageManipulator/out.jpg', { idempotent: true });
  });

  it('yükleme hata verse de geçici dosya silinir; hata çağırana gider', async () => {
    mockRequire.mockReturnValue(fakeManipulator());
    await expect(withPreparedImage(original, async () => Promise.reject(new Error('net')))).rejects.toThrow('net');
    await flush();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('yeniden kodlanmayacak dosya (PDF) hazırlama kuyruğuna girmez, olduğu gibi yüklenir', async () => {
    const manipulator = fakeManipulator();
    mockRequire.mockReturnValue(manipulator);
    const pdf: LocalImageFile = { uri: 'file:///cache/DocumentPicker/a.pdf', name: 'a.pdf', type: 'application/pdf' };
    const upload = jest.fn(async (f: LocalImageFile) => f);
    await expect(withPreparedImage(pdf, upload)).resolves.toBe(pdf);
    expect(manipulator.manipulate).not.toHaveBeenCalled();
  });

  it("manipulator yoksa orijinal yüklenir, hiçbir dosya silinmez", async () => {
    const upload = jest.fn(async (f: LocalImageFile) => f);
    await expect(withPreparedImage(original, upload)).resolves.toBe(original);
    await flush();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('fromPickerAsset', () => {
  const asset = (over: Partial<ImagePickerAsset>): ImagePickerAsset => ({
    uri: 'file:///tmp/a.jpg',
    width: 4000,
    height: 3000,
    ...over,
  });

  it('URI önekli kalır, boyutlar taşınır', () => {
    expect(fromPickerAsset(asset({ fileName: 'a.jpg', mimeType: 'image/jpeg' }), 'x.jpg')).toEqual({
      uri: 'file:///tmp/a.jpg',
      name: 'a.jpg',
      type: 'image/jpeg',
      width: 4000,
      height: 3000,
    });
  });

  it('MIME yoksa uzantıdan (jpg → image/jpeg); o da yoksa image/jpeg', () => {
    expect(fromPickerAsset(asset({ fileName: 'IMG.HEIC' }), 'x.jpg').type).toBe('image/heic');
    expect(fromPickerAsset(asset({}), 'fallback.jpg')).toMatchObject({ name: 'fallback.jpg', type: 'image/jpeg' });
    expect(fromPickerAsset(asset({ fileName: 'noext', width: 0, height: 0 }), 'x')).toMatchObject({
      type: 'image/jpeg',
      width: undefined,
      height: undefined,
    });
  });
});

describe('iptal yardımcıları', () => {
  it('isAbortError: axios/fetch iptal biçimleri', () => {
    expect(isAbortError(abortError())).toBe(true);
    expect(isAbortError({ name: 'CanceledError' })).toBe(true);
    expect(isAbortError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });

  it('untilAborted: sinyal gelince hemen AbortError', async () => {
    const ctrl = new AbortController();
    const pending = untilAborted(new Promise(() => undefined), ctrl.signal);
    ctrl.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
