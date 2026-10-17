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
    expect(decideWebRequest('tarodan://cart', true)).toBe('block');
  });
});

describe('decideWebRequest — embed kipi (yasal belgeler)', () => {
  it('yalnız uygulama modu sayfaları (/app/*, /en/app/*) içeride kalır', () => {
    expect(decideWebRequest('https://tarodan.com.tr/app/terms', true, 'embed')).toBe('allow');
    expect(decideWebRequest('https://tarodan.com.tr/en/app/privacy#kvkk', true, 'embed')).toBe('allow');
    expect(decideWebRequest('https://staging.tarodan.com.tr/app/cookies?x=1', true, 'embed')).toBe('allow');
  });

  it('kendi sitemizin diğer sayfaları ve dış linkler sistem tarayıcısında açılır', () => {
    expect(decideWebRequest('https://tarodan.com.tr/contact', true, 'embed')).toBe('external');
    expect(decideWebRequest('https://tarodan.com.tr/terms', true, 'embed')).toBe('external');
    expect(decideWebRequest('https://tarodan.com.tr/application/x', true, 'embed')).toBe('external');
    expect(decideWebRequest('https://example.org/x', true, 'embed')).toBe('external');
    expect(decideWebRequest('mailto:destek@tarodan.com.tr', true, 'embed')).toBe('external');
    expect(decideWebRequest('tel:+902324334142', true, 'embed')).toBe('external');
  });

  it('satın alma yolları ve güvensiz şemalar embed kipinde de engelli; iframe serbest', () => {
    expect(decideWebRequest('https://tarodan.com.tr/membership', true, 'embed')).toBe('block');
    expect(decideWebRequest('https://tarodan.com.tr/en/pricing', true, 'embed')).toBe('block');
    expect(decideWebRequest('javascript:alert(1)', true, 'embed')).toBe('block');
    expect(decideWebRequest('http://tarodan.com.tr/app/terms', true, 'embed')).toBe('block');
    expect(decideWebRequest('https://www.youtube.com/embed/x', false, 'embed')).toBe('allow');
  });

  it('varsayılan (site) kipi: kendi sitemizin her sayfası içeride', () => {
    expect(decideWebRequest('https://tarodan.com.tr/contact', true)).toBe('allow');
  });

  it.each(['site', 'embed'] as const)(
    '%s: mailto/tel sisteme, diğer şemalar engelli (originWhitelist hepsini buraya sorar)',
    (mode) => {
      expect(decideWebRequest('mailto:destek@tarodan.com.tr', true, mode)).toBe('external');
      expect(decideWebRequest('TEL:+902324334142', true, mode)).toBe('external');
      for (const url of [
        'sms:+905550000000',
        'intent://scan/#Intent;scheme=zxing;end',
        'itms-apps://apps.apple.com/app/id1',
        'tarodan://membership',
        'data:text/html,hi',
        'javascript:alert(1)',
      ]) {
        expect(`${url} → ${decideWebRequest(url, true, mode)}`).toBe(`${url} → block`);
      }
    },
  );
});
