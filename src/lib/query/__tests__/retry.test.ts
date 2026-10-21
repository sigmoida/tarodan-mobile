import { retryUnlessClientError } from '../retry';

/**
 * retryUnlessClientError — sepet ve checkout AYNI quote anahtarını paylaşır;
 * yüklem iki hook'ta kopyalanırsa aynı sorgu iki ekranda farklı sayıda istek
 * atar (bulgu N3). Tek kaynak burada.
 */
describe('retryUnlessClientError', () => {
  it('4xx yeniden DENENMEZ (kupon 400 ı üç kez uyarı bastırıyordu)', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 499]) {
      expect(retryUnlessClientError(0, { response: { status } })).toBe(false);
    }
  });

  it('5xx ve ağ hataları varsayılan gibi 2 kez denenir', () => {
    const serverError = { response: { status: 500 } };
    expect(retryUnlessClientError(0, serverError)).toBe(true);
    expect(retryUnlessClientError(1, serverError)).toBe(true);
    expect(retryUnlessClientError(2, serverError)).toBe(false);

    // Yanıtsız (ağ kopması) — status yok.
    expect(retryUnlessClientError(0, new Error('Network Error'))).toBe(true);
    expect(retryUnlessClientError(2, new Error('Network Error'))).toBe(false);
  });

  it('status sayı değilse istemci hatası sayılmaz (yüklem yanlış kısa devre yapmaz)', () => {
    expect(retryUnlessClientError(0, { response: { status: '400' } })).toBe(true);
    expect(retryUnlessClientError(0, null)).toBe(true);
    expect(retryUnlessClientError(0, undefined)).toBe(true);
  });
});
