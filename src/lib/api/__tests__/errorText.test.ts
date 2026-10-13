import { apiErrorLines, apiErrorMessage, errorText } from '../errorText';

describe('errorText', () => {
  it('returns a string message as-is', () => {
    const e = { response: { data: { message: 'email must be an email' } } };
    expect(errorText(e, 'fallback')).toBe('email must be an email');
  });

  it('joins an array message line by line', () => {
    const e = {
      response: {
        data: { message: ['email must be an email', 'password too short'] },
      },
    };
    expect(errorText(e, 'fallback')).toBe(
      'email must be an email\npassword too short',
    );
  });

  it('falls back when there is no message', () => {
    expect(errorText(undefined, 'fallback')).toBe('fallback');
    expect(errorText({}, 'fallback')).toBe('fallback');
    expect(errorText({ response: {} }, 'fallback')).toBe('fallback');
  });

  it('falls back when message is an empty string (regression: ?? would keep "")', () => {
    const e = { response: { data: { message: '' } } };
    expect(errorText(e, 'fallback')).toBe('fallback');
  });

  it('falls back when message is an empty array', () => {
    const e = { response: { data: { message: [] } } };
    expect(errorText(e, 'fallback')).toBe('fallback');
  });
});

describe('apiErrorMessage — tek kaynak', () => {
  const body = (data: unknown) => ({ response: { data } });

  it("'first' (varsayılan): dizi ise ilk eleman; 'all': \\n ile birleşik", () => {
    const e = body({ message: ['a must be x', 'b too short'] });
    expect(apiErrorMessage(e, 'fb')).toBe('a must be x');
    expect(apiErrorMessage(e, 'fb', 'first')).toBe('a must be x');
    expect(apiErrorMessage(e, 'fb', 'all')).toBe('a must be x\nb too short');
  });

  it('string mesaj iki modda da aynı ve kırpılır', () => {
    const e = body({ message: '  Teklif bulunamadı ' });
    expect(apiErrorMessage(e, 'fb')).toBe('Teklif bulunamadı');
    expect(apiErrorMessage(e, 'fb', 'all')).toBe('Teklif bulunamadı');
  });

  it('dizide boş / string olmayan elemanlar atlanır; hepsi boşsa sonraki kaynağa düşer', () => {
    expect(apiErrorMessage(body({ message: ['', '  ', 'gerçek'] }), 'fb')).toBe('gerçek');
    expect(apiErrorMessage(body({ message: ['', null, 3], error: 'Bad Request' }), 'fb')).toBe('Bad Request');
    expect(apiErrorMessage(body({ message: [] }), 'fb')).toBe('fb');
  });

  it('constraints dalı (class-validator ValidationError): değerler ", " ile birleşir', () => {
    const e = body({
      message: [{ constraints: { isEmail: 'email must be an email', minLength: 'email too short' } }, 'x'],
    });
    expect(apiErrorMessage(e, 'fb')).toBe('email must be an email, email too short');
    expect(apiErrorMessage(e, 'fb', 'all')).toBe('email must be an email, email too short\nx');
  });

  it('dizideki { message } nesnesi okunur', () => {
    expect(apiErrorMessage(body({ message: [{ message: 'nested' }] }), 'fb')).toBe('nested');
  });

  it('error dalı: message yoksa `error` string kullanılır', () => {
    expect(apiErrorMessage(body({ error: 'Forbidden' }), 'fb')).toBe('Forbidden');
    expect(apiErrorMessage(body({ message: '', error: ' Not Found ' }), 'fb')).toBe('Not Found');
  });

  it('statusCode dalı: gövde var, mesaj yok -> "<fallback> (<kod>)"', () => {
    expect(apiErrorMessage(body({ statusCode: 500 }), 'fb')).toBe('fb (500)');
    expect(apiErrorMessage(body({ statusCode: '500' }), 'fb')).toBe('fb');
    expect(apiErrorMessage(body({}), 'fb')).toBe('fb');
  });

  it('ax.message dalı: gövde YOKSA (ağ hatası) e.message; boşsa fallback', () => {
    expect(apiErrorMessage(new Error('Network Error'), 'fb')).toBe('Network Error');
    expect(apiErrorMessage({ message: '' }, 'fb')).toBe('fb');
    // gövde varsa e.message KULLANILMAZ
    expect(apiErrorMessage({ message: 'Request failed', response: { data: {} } }, 'fb')).toBe('fb');
  });

  it('string olmayan message / hata -> fallback (sayı/nesne ekrana sızmaz)', () => {
    expect(apiErrorMessage(body({ message: 42 }), 'fb')).toBe('fb');
    expect(apiErrorMessage(body({ message: { a: 1 } }), 'fb')).toBe('fb');
    expect(apiErrorMessage(body({ error: 7 }), 'fb')).toBe('fb');
    expect(apiErrorMessage(null, 'fb')).toBe('fb');
    expect(apiErrorMessage(undefined, 'fb')).toBe('fb');
    expect(apiErrorMessage('boom', 'fb')).toBe('fb');
  });

  it('errorText = apiErrorMessage(..., "all") gövde kısmı; ağ hatası / statusCode ekini GÖSTERMEZ', () => {
    const e = body({ message: ['a', 'b'] });
    expect(errorText(e, 'fb')).toBe(apiErrorMessage(e, 'fb', 'all'));
    // apiErrorMessage ağ mesajını gösterir, errorText fallback verir (deleteAccountError sözleşmesi)
    expect(errorText(new Error('Network Error'), 'fb')).toBe('fb');
    expect(errorText(body({ statusCode: 500 }), 'fb')).toBe('fb');
    expect(errorText(body({ error: 'Forbidden' }), 'fb')).toBe('Forbidden');
  });
});

describe('apiErrorLines — eski sarmalayıcıların ortak gövdesi', () => {
  it('gövde satırları; ağ hatası / statusCode içermez', () => {
    expect(apiErrorLines({ response: { data: { message: ['a', 'b'] } } })).toEqual(['a', 'b']);
    expect(apiErrorLines({ response: { data: { error: 'E' } } })).toEqual(['E']);
    expect(apiErrorLines(new Error('Network Error'))).toEqual([]);
    expect(apiErrorLines({ response: { data: { statusCode: 500 } } })).toEqual([]);
  });
});
