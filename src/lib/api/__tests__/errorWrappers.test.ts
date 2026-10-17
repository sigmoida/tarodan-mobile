/**
 * `apiErrorMessage` tek kaynağının eski adlı ince sarmalayıcıları — davranış kilidi.
 * (extractApiMessage: checkout; joinMsg/strMsg: orders; formatApiErrorMessage: utils.)
 */
import { formatApiErrorMessage } from '@/utils/formatApiErrorMessage';
import { extractApiMessage } from '../../../../app/checkout/_lib/validation';
import { joinMsg, strMsg } from '../../../../app/orders/[id]/_lib/errors';

const body = (data: unknown) => ({ response: { data } });

describe('formatApiErrorMessage', () => {
  it('string / dizi / constraints / error / statusCode / ağ mesajı', () => {
    expect(formatApiErrorMessage(body({ message: ' x ' }), 'fb')).toBe('x');
    expect(formatApiErrorMessage(body({ message: ['a', 'b'] }), 'fb')).toBe('a\nb');
    expect(formatApiErrorMessage(body({ message: [{ constraints: { c: 'k' } }] }), 'fb')).toBe('k');
    expect(formatApiErrorMessage(body({ error: 'Bad' }), 'fb')).toBe('Bad');
    expect(formatApiErrorMessage(body({ statusCode: 502 }), 'fb')).toBe('fb (502)');
    expect(formatApiErrorMessage(new Error('Network Error'), 'fb')).toBe('Network Error');
    expect(formatApiErrorMessage(undefined, 'fb')).toBe('fb');
  });

  it('fallback verilmezse genel hata metnine düşer', () => {
    expect(formatApiErrorMessage(undefined)).toEqual(expect.any(String));
    expect(formatApiErrorMessage(undefined).length).toBeGreaterThan(0);
  });
});

describe('extractApiMessage (checkout) — null döner, ağ/statusCode eklemez', () => {
  it('dizi ", " ile birleşir; string / error string; yoksa null', () => {
    expect(extractApiMessage(body({ message: ['a', 'b'] }))).toBe('a, b');
    expect(extractApiMessage(body({ message: 'kupon geçersiz' }))).toBe('kupon geçersiz');
    expect(extractApiMessage(body({ error: 'Conflict' }))).toBe('Conflict');
    expect(extractApiMessage(body({ statusCode: 500 }))).toBeNull();
    expect(extractApiMessage(new Error('Network Error'))).toBeNull();
    expect(extractApiMessage(undefined)).toBeNull();
    expect(extractApiMessage(body({ message: 12 }))).toBeNull();
  });
});

describe('joinMsg / strMsg (orders)', () => {
  it('joinMsg: dizi ", " ile birleşir, mesaj yoksa fallback', () => {
    expect(joinMsg(body({ message: ['a', 'b'] }), 'fb')).toBe('a, b');
    expect(joinMsg(body({ message: 'tek' }), 'fb')).toBe('tek');
    expect(joinMsg(body({ message: '' }), 'fb')).toBe('fb');
    expect(joinMsg(body({ message: 5 }), 'fb')).toBe('fb');
    expect(joinMsg(undefined, 'fb')).toBe('fb');
  });

  it('strMsg (parite): yalnız string; dizi fallback verir', () => {
    expect(strMsg(body({ message: 'tek' }), 'fb')).toBe('tek');
    expect(strMsg(body({ message: ['a', 'b'] }), 'fb')).toBe('fb');
    expect(strMsg(undefined, 'fb')).toBe('fb');
  });
});
