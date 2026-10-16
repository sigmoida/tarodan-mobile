import { requireOptionalNativeModule } from 'expo';

jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(),
  // `@/ui` zinciri (Avatar → expo-image) modül yüklenirken requireNativeModule çağırır.
  requireNativeModule: jest.fn(() => ({})),
}));
const mockDelete = jest.fn(async (_uri: string, _opts?: unknown) => undefined);
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: (uri: string, opts?: unknown) => mockDelete(uri, opts),
}));

import {
  IMAGE_PROFILES,
  MAX_UPLOAD_EDGE,
  UPLOAD_JPEG_QUALITY,
  PREPARE_TIMEOUT_MS,
  SMALL_JPEG_BYTES,
  createPreparer,
  isReencodableImage,
  jpegName,
  loadImageManipulator,
  prepareImageForUpload,
  resizeFor,
  type ImageManipulatorLike,
  type LocalImageFile,
} from '../prepareImage';
import { createSerialRunner } from '../serialRunner';

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
      temporary: true,
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

  it.each([
    ['image/png', 'logo.png'],
    ['image/webp', 'a.webp'],
    ['image/gif', 'a.gif'],
  ])('%s büyük olsa da yeniden kodlanmaz (saydamlık/animasyon korunur)', async (type, name) => {
    const { manipulator, calls } = fakeManipulator();
    const big = file({ uri: `file:///${name}`, name, type, width: 4000, height: 3000 });
    expect(await prepareImageForUpload(big, manipulator)).toBe(big);
    expect(calls).toHaveLength(0);
  });

  it('büyük JPEG küçültülür', async () => {
    const { manipulator, calls } = fakeManipulator();
    const out = await prepareImageForUpload(
      file({ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }),
      manipulator,
    );
    expect(calls[0]!.resize).toEqual([{ width: MAX_UPLOAD_EDGE }]);
    expect(out.type).toBe('image/jpeg');
  });

  it('profil: avatar 600 px / 0.8, belge 2400 px / 0.85', async () => {
    const avatar = fakeManipulator();
    const a = await prepareImageForUpload(file(), avatar.manipulator, IMAGE_PROFILES.avatar);
    expect(avatar.calls[0]!.resize).toEqual([{ width: 600 }]);
    expect(avatar.saves).toEqual([{ format: 'jpeg', compress: 0.8 }]);
    expect(a.width).toBe(600);

    const doc = fakeManipulator();
    await prepareImageForUpload(file(), doc.manipulator, IMAGE_PROFILES.document);
    expect(doc.calls[0]!.resize).toEqual([{ width: 2400 }]);
    expect(doc.saves).toEqual([{ format: 'jpeg', compress: 0.85 }]);
  });

  it('boyutları bilinmeyen küçük JPEG (≤ 1.5 MB) yeniden kodlanmaz; büyüğü işlenir', async () => {
    const { manipulator, calls } = fakeManipulator();
    const noDims = { uri: 'file:///d.jpg', name: 'd.jpg', type: 'image/jpeg', width: undefined, height: undefined };
    const small = file({ ...noDims, size: SMALL_JPEG_BYTES });
    expect(await prepareImageForUpload(small, manipulator)).toBe(small);
    expect(calls).toHaveLength(0);
    const unknownSize = file(noDims);
    expect((await prepareImageForUpload(unknownSize, manipulator)).temporary).toBe(true);
    const big = file({ ...noDims, size: SMALL_JPEG_BYTES + 1 });
    expect((await prepareImageForUpload(big, manipulator)).temporary).toBe(true);
  });

  it('görsel olmayan dosya (PDF) olduğu gibi gider', async () => {
    const { manipulator, calls } = fakeManipulator();
    const pdf = file({ uri: 'file:///belge.pdf', name: 'belge.pdf', type: 'application/pdf', width: undefined });
    expect(await prepareImageForUpload(pdf, manipulator)).toBe(pdf);
    expect(calls).toHaveLength(0);
  });

  it('isReencodableImage: fotoğraf evet; PNG/WebP/GIF/PDF hayır', () => {
    expect(isReencodableImage('image/jpeg')).toBe(true);
    expect(isReencodableImage('image/HEIC')).toBe(true);
    expect(isReencodableImage('image/png')).toBe(false);
    expect(isReencodableImage('image/webp')).toBe(false);
    expect(isReencodableImage('image/gif')).toBe(false);
    expect(isReencodableImage('application/pdf')).toBe(false);
    expect(isReencodableImage(undefined)).toBe(false);
  });

  it('manipulator yoksa (yeniden derlenmemiş dev-client) orijinalle devam eder', async () => {
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

describe('loadImageManipulator (native modül yoksa koruma)', () => {
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

describe('createPreparer (seri + süre sınırı + iptal)', () => {
  afterEach(() => jest.useRealTimers());

  beforeEach(() => mockDelete.mockClear());
  const done = (f: LocalImageFile): LocalImageFile => ({ ...f, uri: `${f.uri}#prepared` });
  /** Hazırlayıcının cache'e yazdığı geçici dosya. */
  const temp = (name: string): LocalImageFile => ({
    uri: `file:///cache/ImageManipulator/${name}`,
    name,
    type: 'image/jpeg',
    temporary: true,
  });
  const never = () => new Promise<LocalImageFile>(() => undefined);

  it('takılan hazırlama süre dolunca ORİJİNAL dosyayla biter ve sıra bir sonrakine geçer', async () => {
    jest.useFakeTimers();
    const prepare = jest.fn((f: LocalImageFile) => (f.name === 'stuck.jpg' ? never() : Promise.resolve(done(f))));
    const run = createPreparer({ prepare });
    const stuck = file({ uri: 'file:///stuck.jpg', name: 'stuck.jpg' });
    const next = file({ uri: 'file:///next.jpg', name: 'next.jpg' });
    const first = run(stuck, { signal: new AbortController().signal });
    const second = run(next, { signal: new AbortController().signal });
    await jest.advanceTimersByTimeAsync(0);
    expect(prepare).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(PREPARE_TIMEOUT_MS - 1);
    expect(prepare).toHaveBeenCalledTimes(1); // süre dolmadan sıra ilerlemez

    await jest.advanceTimersByTimeAsync(1);
    await expect(first).resolves.toBe(stuck);
    await expect(second).resolves.toEqual(done(next));
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it('iptal: takılan kalem hemen AbortError alır, sıra ilerler; sırası gelmemiş iptal edilen hiç hazırlanmaz', async () => {
    const prepare = jest.fn((f: LocalImageFile) => (f.name === 'stuck.jpg' ? never() : Promise.resolve(done(f))));
    const run = createPreparer({ prepare });
    const a = new AbortController();
    const b = new AbortController();
    const c = new AbortController();
    const first = run(file({ uri: 'file:///stuck.jpg', name: 'stuck.jpg' }), { signal: a.signal });
    const second = run(file({ uri: 'file:///queued.jpg', name: 'queued.jpg' }), { signal: b.signal });
    const third = run(file({ uri: 'file:///c.jpg', name: 'c.jpg' }), { signal: c.signal });

    b.abort(); // sırada bekliyor
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    a.abort(); // native adımda takılı
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });

    await expect(third).resolves.toMatchObject({ uri: 'file:///c.jpg#prepared' });
    expect(prepare.mock.calls.map(([f]) => f.name)).toEqual(['stuck.jpg', 'c.jpg']);
  });

  it('hazırlama hata verirse orijinal döner', async () => {
    const run = createPreparer({ prepare: () => Promise.reject(new Error('boom')) });
    const original = file();
    await expect(run(original, { signal: new AbortController().signal })).resolves.toBe(original);
  });

  it('önceden iptal edilmiş sinyal: hazırlama hiç çağrılmaz', async () => {
    const prepare = jest.fn(async (f: LocalImageFile) => f);
    const run = createPreparer({ prepare });
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(run(file(), { signal: ctrl.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(prepare).not.toHaveBeenCalled();
  });

  it('yeniden kodlanmayacak dosya (PDF/PNG) seri kapıya girmez: takılı bir hazırlamayı beklemez', async () => {
    const prepare = jest.fn((f: LocalImageFile) =>
      f.name === 'stuck.jpg' ? never() : Promise.resolve(done(f)),
    );
    const run = createPreparer({ prepare });
    const ctrl = new AbortController();
    const stuck = run(file({ uri: 'file:///stuck.jpg', name: 'stuck.jpg', type: 'image/jpeg' }), { signal: ctrl.signal });
    const pdf = file({ uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' });
    const png = file({ uri: 'file:///a.png', name: 'a.png', type: 'image/png' });
    await expect(run(pdf)).resolves.toBe(pdf);
    await expect(run(png)).resolves.toBe(png);
    expect(prepare).toHaveBeenCalledTimes(1);
    ctrl.abort(); // süre zamanlayıcısı temizlensin
    await expect(stuck).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('profil seçenekleri hazırlamaya iletilir; sinyalsiz çağrı da çalışır', async () => {
    const prepare = jest.fn(async (f: LocalImageFile) => f);
    const run = createPreparer({ prepare });
    const original = file();
    await expect(run(original, IMAGE_PROFILES.avatar)).resolves.toBe(original);
    expect(prepare).toHaveBeenCalledWith(original, { maxEdge: 600, quality: 0.8 });
  });

  it('süre dolduktan SONRA üretilen geçici dosya kimseye verilmeden silinir', async () => {
    jest.useFakeTimers();
    let finish!: (f: LocalImageFile) => void;
    const run = createPreparer({ prepare: () => new Promise<LocalImageFile>((r) => (finish = r)) });
    const original = file();
    const result = run(original);
    await jest.advanceTimersByTimeAsync(PREPARE_TIMEOUT_MS);
    await expect(result).resolves.toBe(original);
    finish(temp('late.jpg'));
    await jest.advanceTimersByTimeAsync(0);
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/ImageManipulator/late.jpg', { idempotent: true });
  });

  it('iptal edilen kalemin geç gelen geçici dosyası silinir; teslim edilen dosya silinmez', async () => {
    let finish!: (f: LocalImageFile) => void;
    const run = createPreparer({ prepare: () => new Promise<LocalImageFile>((r) => (finish = r)) });
    const ctrl = new AbortController();
    const result = run(file(), { signal: ctrl.signal });
    await Promise.resolve();
    ctrl.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    finish(temp('aborted.jpg'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/ImageManipulator/aborted.jpg', { idempotent: true });

    mockDelete.mockClear();
    const ok = createPreparer({ prepare: async () => temp('ok.jpg') });
    await expect(ok(file())).resolves.toMatchObject({ uri: 'file:///cache/ImageManipulator/ok.jpg' });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
