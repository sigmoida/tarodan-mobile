/**
 * Yol enjeksiyonu (HIGH) — expo-router parametresi (derin bağlantı) şablon yola
 * kodlanmadan giriyordu: `id = "x/../../offers/<id>/accept?"` bir mutasyonu başka uca
 * yönlendirebiliyordu. `apiPath` her interpolasyonu doğrular + kodlar.
 */
import { apiPath, seg, keyPath, INVALID_PATH_SEGMENT, isSafePathSegment } from '../path';
import { offersApi, tradesApi } from '../trades';
import { messagesApi } from '../messaging';
import { membershipApi } from '../membership';

describe('seg / apiPath — yol segmenti', () => {
  it('normal kimlik, slug ve sayı olduğu gibi kalır', () => {
    expect(apiPath`/trades/${'3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a'}/accept`).toBe(
      '/trades/3f2c1a9e-0b7d-4c1e-9a55-2d1f0e6b7c8a/accept',
    );
    expect(apiPath`/brands/${'hot-wheels'}`).toBe('/brands/hot-wheels');
    expect(apiPath`/orders/${42}`).toBe('/orders/42');
  });

  it('Unicode slug kodlanır (geçerli)', () => {
    expect(apiPath`/collections/slug/${'şahin'}`).toBe(`/collections/slug/${encodeURIComponent('şahin')}`);
  });

  const attacks = [
    'x/../../offers/abc/accept?',
    '../offers/abc/accept',
    '..',
    '.',
    '',
    'a/b',
    'a\\b',
    'a%2Fb',
    '%2e%2e',
    'a?b=1',
    'a#b',
    'a b',
    'a\nb',
    'a\u0000b',
  ];

  it.each(attacks)('%j → sabit geçersiz segment (yol değişmez)', (value) => {
    const out = apiPath`/trades/${value}/accept`;
    expect(out).toBe(`/trades/${INVALID_PATH_SEGMENT}/accept`);
    expect(out.split('/')).toHaveLength(4);
  });

  it('geçersiz değer FIRLATMAZ (ateşle-unut çağrılar senkron hata almasın)', () => {
    expect(() => seg(undefined as unknown as string)).not.toThrow();
    expect(seg(undefined as unknown as string)).toBe(INVALID_PATH_SEGMENT);
    expect(seg(['a', 'b'] as unknown as string)).toBe(INVALID_PATH_SEGMENT);
    expect(seg(NaN)).toBe(INVALID_PATH_SEGMENT);
  });

  it('isSafePathSegment', () => {
    expect(isSafePathSegment('abc_1.2~x:y@z-')).toBe(true);
    expect(isSafePathSegment('..')).toBe(false);
    expect(isSafePathSegment(null)).toBe(false);
  });
});

describe('keyPath — depolama key yolu (file/* joker)', () => {
  it('`/` korunur, parçalar doğrulanır', () => {
    expect(apiPath`/media/file/${keyPath('dev/messages/a-1.webp')}`).toBe('/media/file/dev/messages/a-1.webp');
  });

  it('dizin çıkışı / boş parça geçersiz', () => {
    expect(apiPath`/media/file/${keyPath('dev/../users/x')}`).toBe(
      `/media/file/dev/${INVALID_PATH_SEGMENT}/users/x`,
    );
    expect(apiPath`/media/file/${keyPath('')}`).toBe(`/media/file/${INVALID_PATH_SEGMENT}`);
  });
});

const mockCalls: Array<[string, string]> = [];
jest.mock('../client', () => {
  const record = (method: string) => (url: string) => {
    mockCalls.push([method, url]);
    return Promise.resolve({ data: {} });
  };
  const client = {
    get: record('get'),
    post: record('post'),
    put: record('put'),
    patch: record('patch'),
    delete: record('delete'),
  };
  return { api: client, guestApi: client };
});

describe('API modülleri yolu kodlar (örnek uçlar)', () => {
  const calls = mockCalls;

  beforeEach(() => {
    calls.length = 0;
  });

  it('teklif kabulü başka bir uca yönlendirilemez', async () => {
    await offersApi.accept('x/../../trades/t1/cancel?');
    await tradesApi.accept('../offers/o1/accept', 'm', 'a1');
    expect(calls).toEqual([
      ['post', `/offers/${INVALID_PATH_SEGMENT}/accept`],
      ['post', `/trades/${INVALID_PATH_SEGMENT}/accept`],
    ]);
  });

  it('mesaj gönderimi ve kart silme kodlanır', async () => {
    await messagesApi.sendMessage('t1/../t2', 'merhaba');
    await membershipApi.deleteCard('c1');
    expect(calls).toEqual([
      ['post', `/messages/threads/${INVALID_PATH_SEGMENT}/messages`],
      ['delete', '/membership/cards/c1'],
    ]);
  });
});
