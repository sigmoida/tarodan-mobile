/**
 * Multipart dosya parçası — TEK yardımcı (`appendRNFile`): iOS'ta `file://` öneki atılır,
 * Android'de korunur; yalnız uri/name/type gider. Bütün yükleme uçları bunu kullanır.
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
  },
  guestApi: { post: jest.fn(), get: jest.fn() },
}));

import { Platform } from 'react-native';
import { api } from '../client';
import { appendRNFile, formDataUri } from '../formData';
import { mediaApi } from '../media';
import { collectionsApi } from '../catalog';
import { sellerDocumentsApi } from '../user';
import { sellerInvoiceApi } from '../orders';

/** Kayıt tutan FormData (jest ortamının FormData'sı RN dosya nesnesini string'e çevirir). */
class RecordingFormData {
  parts: Array<[string, unknown]> = [];
  append(field: string, value: unknown) {
    this.parts.push([field, value]);
  }
}
const originalOS = Platform.OS;
const originalFormData = global.FormData;
beforeEach(() => {
  global.FormData = RecordingFormData as unknown as typeof FormData;
});
afterEach(() => {
  Platform.OS = originalOS;
  global.FormData = originalFormData;
  jest.clearAllMocks();
});

const local = { uri: 'file:///cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg', temporary: true };

/** İsteğin FormData'sındaki dosya parçası. */
function filePart(mock: jest.Mock, field: string): unknown {
  const form = mock.mock.calls[0]![1] as RecordingFormData;
  return form.parts.find(([name]) => name === field)?.[1];
}

it('formDataUri: iOS öneksiz, Android önekli', () => {
  Platform.OS = 'ios';
  expect(formDataUri('file:///a.jpg')).toBe('/a.jpg');
  Platform.OS = 'android';
  expect(formDataUri('file:///a.jpg')).toBe('file:///a.jpg');
});

it('appendRNFile yalnız uri/name/type ekler (iOS biçimiyle)', () => {
  Platform.OS = 'ios';
  const form = new RecordingFormData();
  appendRNFile(form as unknown as FormData, 'file', local);
  expect(form.parts).toEqual([['file', { uri: '/cache/ImageManipulator/p.jpg', name: 'p.jpg', type: 'image/jpeg' }]]);
});

it.each([
  ['avatar', () => mediaApi.uploadAvatar(local), api.post, 'avatar'],
  ['mesaj eki', () => mediaApi.uploadMessageImage(local), api.post, 'file'],
  ['iade kanıtı', () => mediaApi.uploadRefundEvidence(local), api.post, 'file'],
  ['ürün görseli', () => mediaApi.uploadProductImage(local), api.post, 'images'],
  ['koleksiyon kapağı', () => collectionsApi.updateCover('c1', local), api.patch, 'cover'],
  ['işletme belgesi', () => sellerDocumentsApi.upload('tax_plate', local), api.post, 'file'],
  ['satıcı faturası', () => sellerInvoiceApi.upload('o1', local), api.post, 'file'],
])('%s: dosya parçası tek yardımcıdan, iOS biçiminde', async (_label, call, method, field) => {
  Platform.OS = 'ios';
  await call();
  expect(filePart(method as jest.Mock, field)).toEqual({
    uri: '/cache/ImageManipulator/p.jpg',
    name: 'p.jpg',
    type: 'image/jpeg',
  });
});
