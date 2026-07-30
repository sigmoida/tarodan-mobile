/**
 * Kurumsal başvuru API katmanı. Belge yüklemesi multipart (`file` + `documentType`,
 * paydaş kimliğinde `stakeholderId`); itiraz notu gövdede `note`.
 *
 * Not: mock fonksiyonlarını dış scope'ta `const mockX = jest.fn()` olarak tanımlayıp
 * `jest.mock` fabrikası içinden referans vermek — brief'in önerdiği desen — bu repoda
 * `import { api } from '../client'` (named import) + `../user` birlikte yüklendiğinde
 * `api.get` vb. undefined dönmesine yol açıyor (babel-jest hoist + named-import
 * etkileşimi, ayrı bir kök neden). Bunun yerine mock fonksiyonlarını fabrika İÇİNDE
 * tanımlayıp `api.get`/`api.post`/`api.patch` üzerinden `jest.Mock` olarak
 * dışa çekiyoruz — aynı davranışı doğrulayan, bu ortamda güvenilir çalışan desen.
 */
jest.mock('../client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(),
  },
  guestApi: { post: jest.fn(), get: jest.fn() },
}));

import { api } from '../client';
import { sellerDocumentsApi } from '../user';

const mockPost = api.post as jest.Mock;
const mockGet = api.get as jest.Mock;
const mockPatch = api.patch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it('başvuruyu doğru uçtan okur', async () => {
  await sellerDocumentsApi.getApplication();
  expect(mockGet).toHaveBeenCalledWith('/users/me/seller-documents/application');
});

it('başvuru bilgilerini PATCH ile günceller', async () => {
  await sellerDocumentsApi.updateApplication({ taxId: '1234567890' });
  expect(mockPatch).toHaveBeenCalledWith('/users/me/seller-documents/application', {
    taxId: '1234567890',
  });
});

it('paydaş ekler', async () => {
  await sellerDocumentsApi.addStakeholder({ fullName: 'Ayşe Yılmaz', identityType: 'tckn', identityNumber: '12345678901' });
  expect(mockPost).toHaveBeenCalledWith(
    '/users/me/seller-documents/application/stakeholders',
    { fullName: 'Ayşe Yılmaz', identityType: 'tckn', identityNumber: '12345678901' },
  );
});

it('başvuruyu incelemeye gönderir', async () => {
  await sellerDocumentsApi.submit();
  expect(mockPost).toHaveBeenCalledWith('/users/me/seller-documents/application/submit');
});

it('belge kararına itiraz eder', async () => {
  await sellerDocumentsApi.appeal('doc-1', 'Belge güncel, tekrar inceleyin.');
  expect(mockPost).toHaveBeenCalledWith('/users/me/seller-documents/doc-1/appeal', {
    note: 'Belge güncel, tekrar inceleyin.',
  });
});

it('belge yüklerken documentType ve file alanlarını multipart gönderir', async () => {
  await sellerDocumentsApi.upload('tax_plate', { uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' });
  const [url, body, config] = mockPost.mock.calls[0] as any[];
  expect(url).toBe('/users/me/seller-documents');
  expect(config.headers['Content-Type']).toBe('multipart/form-data');
  expect(body).toBeInstanceOf(FormData);
});

it('paydaş kimlik belgesinde stakeholderId ekler', async () => {
  const appendSpy = jest.spyOn(FormData.prototype, 'append');
  await sellerDocumentsApi.upload(
    'identity_front',
    { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    'sh-1',
  );
  expect(appendSpy).toHaveBeenCalledWith('stakeholderId', 'sh-1');
  appendSpy.mockRestore();
});
