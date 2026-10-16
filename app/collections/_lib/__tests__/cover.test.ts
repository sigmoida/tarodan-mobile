/**
 * Koleksiyon kapağı — yeni/düzenle ekranlarının ortak seçme/yükleme yolu: picker kaliteyi
 * `pickerQuality()`'den alır, yüklemeden önce hazırlanır (≤1600 px JPEG), `updateCover`
 * hazırlanmış dosyayı alır.
 */
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
const mockWithPrepared = jest.fn(
  async (_file: unknown, fn: (f: unknown) => Promise<unknown>, _opts?: unknown) =>
    fn({ uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg', temporary: true }),
);
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  withPreparedImage: (file: unknown, fn: (f: unknown) => Promise<unknown>, opts?: unknown) =>
    mockWithPrepared(file, fn, opts),
}));
const mockUpdateCover = jest.fn(async (..._a: unknown[]) => ({ data: {} }));
jest.mock('@/lib/api', () => ({ collectionsApi: { updateCover: (...a: unknown[]) => mockUpdateCover(...a) } }));

import { coverFileFor, pickCollectionCover, uploadCollectionCover } from '../cover';
import { pickerQuality } from '@/lib/media';

const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

beforeEach(() => {
  launch.mockReset();
  mockWithPrepared.mockClear();
  mockUpdateCover.mockClear();
});

it('seçici 16:9 kırpma + pickerQuality ile açılır; dosya bilgisi (tür/boyut) döner', async () => {
  launch.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/c.jpg', fileName: 'c.jpg', mimeType: 'image/jpeg', width: 3200, height: 1800 }],
  });
  await expect(pickCollectionCover()).resolves.toEqual({
    uri: 'file:///tmp/c.jpg',
    name: 'c.jpg',
    type: 'image/jpeg',
    width: 3200,
    height: 1800,
  });
  expect(launch).toHaveBeenCalledWith(
    expect.objectContaining({ allowsEditing: true, aspect: [16, 9], quality: pickerQuality() }),
  );
});

it('vazgeçilirse null', async () => {
  launch.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickCollectionCover()).resolves.toBeNull();
});

it('yükleme hazırlanmış dosyayla yapılır (ad/tür eskisi gibi sabit)', async () => {
  const file = { uri: 'file:///tmp/c.heic', name: 'c.heic', type: 'image/heic', width: 4000, height: 2250 };
  await uploadCollectionCover('col-1', file);
  expect(mockWithPrepared).toHaveBeenCalledWith(file, expect.any(Function), undefined);
  expect(mockUpdateCover).toHaveBeenCalledWith('col-1', {
    uri: 'file:///cache/ImageManipulator/p.jpg',
    name: 'cover.jpg',
    type: 'image/jpeg',
  });
});

it('coverFileFor: seçilen dosya URI eşleşirse onu, değilse yalnız URI\'den dosya', () => {
  const picked = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg', width: 10, height: 10 };
  expect(coverFileFor('file:///a.jpg', picked)).toBe(picked);
  expect(coverFileFor('file:///b.jpg', picked)).toEqual({ uri: 'file:///b.jpg', name: 'cover.jpg', type: 'image/jpeg' });
  expect(coverFileFor('file:///b.jpg', null)).toMatchObject({ uri: 'file:///b.jpg' });
});
