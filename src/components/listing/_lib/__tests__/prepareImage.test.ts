import { requireOptionalNativeModule } from 'expo';

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));

import {
  MAX_UPLOAD_EDGE,
  UPLOAD_JPEG_QUALITY,
  createSerialRunner,
  jpegName,
  loadImageManipulator,
  prepareImageForUpload,
  resizeFor,
  type ImageManipulatorLike,
  type LocalImageFile,
} from '../prepareImage';

const file = (over: Partial<LocalImageFile> = {}): LocalImageFile => ({
  uri: 'file:///tmp/IMG_0001.HEIC',
  name: 'IMG_0001.HEIC',
  type: 'image/heic',
  width: 4032,
  height: 3024,
  ...over,
});

/** Sahte manipulator: işlenen görselin boyutunu `resize` çağrılarına göre hesaplar. */
function fakeManipulator(opts: { rendered?: { width: number; height: number }; fail?: boolean } = {}) {
  const calls: Array<{ source: unknown; resize: unknown[] }> = [];
  const saves: unknown[] = [];
  const released: string[] = [];
  const manipulator: ImageManipulatorLike = {
    manipulate(source) {
      const entry = { source, resize: [] as unknown[] };
      calls.push(entry);
      const base =
        typeof source === 'string'
          ? (opts.rendered ?? { width: 4032, height: 3024 })
          : { width: source.width, height: source.height };
      let size = { ...base };
      const ctx = {
        resize(r: { width?: number | null; height?: number | null }) {
          entry.resize.push(r);
          const ratio = r.width ? r.width / size.width : (r.height as number) / size.height;
          size = { width: Math.round(size.width * ratio), height: Math.round(size.height * ratio) };
          return ctx;
        },
        async renderAsync() {
          if (opts.fail) throw new Error('decode failed');
          return {
            ...size,
            async saveAsync(o: unknown) {
              saves.push(o);
              return { uri: `file:///cache/out-${calls.length}.jpg` };
            },
            release: () => released.push('ref'),
          };
        },
        release: () => released.push('ctx'),
      };
      return ctx;
    },
  };
  return { manipulator, calls, saves, released };
}

describe('resizeFor', () => {
  it('uzun kenarı sınıra indirir; yatay → width, dikey → height', () => {
    expect(resizeFor(4032, 3024)).toEqual({ width: MAX_UPLOAD_EDGE });
    expect(resizeFor(3024, 4032)).toEqual({ height: MAX_UPLOAD_EDGE });
  });
  it('sınırın altında / boyut bilinmiyorsa null', () => {
    expect(resizeFor(1600, 1200)).toBeNull();
    expect(resizeFor(undefined, 1200)).toBeNull();
    expect(resizeFor(0, 0)).toBeNull();
  });
});

describe('jpegName', () => {
  it('uzantıyı .jpg yapar', () => {
    expect(jpegName('IMG_0001.HEIC')).toBe('IMG_0001.jpg');
    expect(jpegName('photo')).toBe('photo.jpg');
    expect(jpegName('a.b.png')).toBe('a.b.jpg');
  });
});

describe('prepareImageForUpload', () => {
  it('büyük HEIC → ≤1600 px JPEG (0.75), yeni dosya adı/türü; nesneler serbest bırakılır', async () => {
    const { manipulator, calls, saves, released } = fakeManipulator();
    const out = await prepareImageForUpload(file(), manipulator);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.resize).toEqual([{ width: MAX_UPLOAD_EDGE }]);
    expect(saves).toEqual([{ format: 'jpeg', compress: UPLOAD_JPEG_QUALITY }]);
    expect(out).toEqual({
      uri: 'file:///cache/out-1.jpg',
      name: 'IMG_0001.jpg',
      type: 'image/jpeg',
      width: 1600,
      height: 1200,
    });
    expect(released).toEqual(expect.arrayContaining(['ctx', 'ref']));
  });

  it('EXIF yönü yüzünden işlenen görsel hâlâ büyükse ikinci geçişte gerçek boyuttan küçültür', async () => {
    // Picker 4032×3024 bildiriyor, gerçek (yönlendirilmiş) görsel 3024×4032.
    const { manipulator, calls } = fakeManipulator({ rendered: { width: 3024, height: 4032 } });
    const out = await prepareImageForUpload(file(), manipulator);
    expect(calls).toHaveLength(2);
    expect(Math.max(out.width!, out.height!)).toBeLessThanOrEqual(MAX_UPLOAD_EDGE);
  });

  it('boyut bilinmiyorsa önce işler, sonra gerçek boyuttan küçültür', async () => {
    const { manipulator, calls } = fakeManipulator();
    const out = await prepareImageForUpload(file({ width: undefined, height: undefined }), manipulator);
    expect(calls[0]!.resize).toEqual([]);
    expect(calls[1]!.resize).toEqual([{ width: MAX_UPLOAD_EDGE }]);
    expect(out.width).toBe(MAX_UPLOAD_EDGE);
  });

  it('küçük JPEG yeniden kodlanmaz (orijinal döner)', async () => {
    const { manipulator, calls } = fakeManipulator();
    const small = file({ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg', width: 1200, height: 900 });
    expect(await prepareImageForUpload(small, manipulator)).toBe(small);
    expect(calls).toHaveLength(0);
  });

  it('küçük HEIC yine JPEG\'e çevrilir (sunucu HEIC kabul etmiyor)', async () => {
    const { manipulator, calls } = fakeManipulator({ rendered: { width: 1000, height: 800 } });
    const out = await prepareImageForUpload(file({ width: 1000, height: 800 }), manipulator);
    expect(calls[0]!.resize).toEqual([]);
    expect(out.type).toBe('image/jpeg');
  });

  it('manipulator yoksa (eski binary) orijinalle devam eder', async () => {
    const original = file();
    expect(await prepareImageForUpload(original, null)).toBe(original);
  });

  it('işlem hata verirse sessizce orijinalle devam eder', async () => {
    const { manipulator } = fakeManipulator({ fail: true });
    const original = file();
    await expect(prepareImageForUpload(original, manipulator)).resolves.toBe(original);
  });

  it('manipulate senkron fırlatsa da orijinal döner', async () => {
    const original = file();
    const broken: ImageManipulatorLike = {
      manipulate: () => {
        throw new Error('native module missing');
      },
    };
    await expect(prepareImageForUpload(original, broken)).resolves.toBe(original);
  });
});

describe('loadImageManipulator (OTA ile eski binary koruması)', () => {
  const mockRequire = requireOptionalNativeModule as jest.Mock;

  it('native modül yoksa null', () => {
    mockRequire.mockReturnValueOnce(null);
    expect(loadImageManipulator()).toBeNull();
    expect(mockRequire).toHaveBeenLastCalledWith('ExpoImageManipulator');
  });

  it('modül çözümü fırlatırsa null (fırlatmaz)', () => {
    mockRequire.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(loadImageManipulator()).toBeNull();
  });

  it('beklenen yüzeyi olmayan modül null; olan modül döner', () => {
    mockRequire.mockReturnValueOnce({});
    expect(loadImageManipulator()).toBeNull();
    const mod = { manipulate: jest.fn() };
    mockRequire.mockReturnValueOnce(mod);
    expect(loadImageManipulator()).toBe(mod);
  });

  it('varsayılan yolda modül yoksa yükleme orijinal dosyayla devam eder', async () => {
    mockRequire.mockReturnValueOnce(null);
    const original = file();
    await expect(prepareImageForUpload(original)).resolves.toBe(original);
  });
});

describe('createSerialRunner', () => {
  it('işleri sırayla çalıştırır; bir hata kuyruğu durdurmaz', async () => {
    const run = createSerialRunner();
    const order: string[] = [];
    let release!: () => void;
    const first = run(
      () =>
        new Promise<void>((r) => {
          order.push('a:start');
          release = () => {
            order.push('a:end');
            r();
          };
        }),
    );
    const second = run(async () => {
      order.push('b');
      throw new Error('x');
    });
    const third = run(async () => {
      order.push('c');
      return 3;
    });
    await Promise.resolve();
    expect(order).toEqual(['a:start']);
    release();
    await first;
    await expect(second).rejects.toThrow('x');
    await expect(third).resolves.toBe(3);
    expect(order).toEqual(['a:start', 'a:end', 'b', 'c']);
  });
});
