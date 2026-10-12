/**
 * Uygulama içi web ekranı — iframe'ler ve dış linkler.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { decideWebRequest } from '../webViewGuard';

describe('decideWebRequest — iframe ve dış linkler', () => {
  it('üst çerçeve olmayan yüklemeler (iframe) her zaman izinli', () => {
    expect(decideWebRequest('https://www.youtube.com/embed/x', false)).toBe('allow');
    expect(decideWebRequest('https://tarodan.com.tr/membership', false)).toBe('allow');
  });

  it('üst çerçevede dış https linki sistem tarayıcısına yönlenir (sessizce yutulmaz)', () => {
    expect(decideWebRequest('https://example.org/x', true)).toBe('external');
  });

  it('üst çerçevede kendi sayfamız izinli, satın alma engelli, özel şema/http engelli', () => {
    expect(decideWebRequest('https://tarodan.com.tr/blog/x', true)).toBe('allow');
    expect(decideWebRequest('https://tarodan.com.tr/en/membership', true)).toBe('block');
    expect(decideWebRequest('about:blank', true)).toBe('allow');
    expect(decideWebRequest('javascript:alert(1)', true)).toBe('block');
    expect(decideWebRequest('http://example.org/x', true)).toBe('block');
    expect(decideWebRequest('tel:+90555', true)).toBe('block');
  });
});
