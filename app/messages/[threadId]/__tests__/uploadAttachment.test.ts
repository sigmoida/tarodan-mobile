/**
 * Mesaj eki — yüklemeden önce ortak hazırlamadan (`@/lib/media`) geçer; yüklenen dosya
 * hazırlanmış (küçültülmüş) dosyadır (iOS URI biçimi API katmanında, `appendRNFile`).
 */
const mockWithPrepared = jest.fn(
  async (_file: unknown, fn: (f: unknown) => Promise<unknown>, _opts?: unknown) =>
    fn({ uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg', temporary: true }),
);
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: unknown, fn: (f: unknown) => Promise<unknown>, opts?: unknown) =>
    mockWithPrepared(file, fn, opts),
}));
const mockUploadMessageImage = jest.fn();
jest.mock('@/lib/api', () => ({
  mediaApi: { uploadMessageImage: (...a: unknown[]) => mockUploadMessageImage(...a) },
}));

import { uploadMessageAttachment } from '../_lib/uploadAttachment';

const picked = { uri: 'file:///tmp/IMG_1.HEIC', name: 'IMG_1.HEIC', type: 'image/heic', width: 4032, height: 3024 };

beforeEach(() => {
  mockWithPrepared.mockClear();
  mockUploadMessageImage.mockReset();
});

it('seçilen fotoğraf hazırlanır, hazırlanmış dosya yüklenir; URL döner', async () => {
  mockUploadMessageImage.mockResolvedValue({ data: { url: 'https://x/m.jpg' } });
  await expect(uploadMessageAttachment(picked)).resolves.toBe('https://x/m.jpg');
  expect(mockWithPrepared).toHaveBeenCalledWith(picked, expect.any(Function), undefined);
  expect(mockUploadMessageImage).toHaveBeenCalledWith(
    expect.objectContaining({ uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg' }),
  );
});

it('iç içe `data.url` biçimi de okunur; URL yoksa undefined', async () => {
  mockUploadMessageImage.mockResolvedValueOnce({ data: { data: { url: 'https://x/n.jpg' } } });
  await expect(uploadMessageAttachment(picked)).resolves.toBe('https://x/n.jpg');
  mockUploadMessageImage.mockResolvedValueOnce({ data: {} });
  await expect(uploadMessageAttachment(picked)).resolves.toBeUndefined();
});
