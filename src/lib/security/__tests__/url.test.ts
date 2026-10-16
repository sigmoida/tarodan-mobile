/**
 * Ortak katı adres ayrıştırıcısı ve güvenli dış link açıcı.
 */
import { Linking } from 'react-native';
import { parseStrictUrl, strictHttpsHost } from '../url';
import { openExternalUrlSafely } from '../openExternalUrl';

describe('parseStrictUrl', () => {
  it('normal https adresini parçalar, host küçük harf, :443 atılır', () => {
    expect(parseStrictUrl('HTTPS://Tarodan.COM.tr:443/a/b?x=1#h')).toEqual({
      scheme: 'https',
      host: 'tarodan.com.tr',
      path: '/a/b',
      search: '?x=1',
      hash: '#h',
    });
    expect(parseStrictUrl('https://tarodan.com.tr')?.path).toBe('/');
    expect(parseStrictUrl('https://tarodan.com.tr?q=1')).toMatchObject({ path: '/', search: '?q=1' });
    // Yolda `@` serbest (yetki bölümü değil).
    expect(strictHttpsHost('https://tarodan.com.tr/u/@ayse')).toBe('tarodan.com.tr');
  });

  it.each([
    ['userinfo', 'https://x@staging.tarodan.com.tr/'],
    ['userinfo + parola', 'https://a:b@tarodan.com.tr/'],
    ['varsayılan dışı port', 'https://tarodan.com.tr:8443/'],
    ['boş port', 'https://tarodan.com.tr:/'],
    ['ters eğik çizgi', 'https://tarodan.com.tr\\@evil.example/'],
    ['yolda ters eğik çizgi', 'https://tarodan.com.tr/a\\b'],
    ['host\'ta yüzde kodlaması', 'https://tarodan%2ecom.tr/'],
    ['host\'ta boşluk', 'https://taro dan.com.tr/'],
    ['kontrol karakteri', 'https://tarodan.com.tr/\u0000'],
    ['sondaki nokta', 'https://tarodan.com.tr./'],
    ['IPv6', 'https://[::1]/'],
    ['boş host', 'https:///x'],
    ['http (izinsiz)', 'http://tarodan.com.tr/'],
    ['javascript:', 'javascript:alert(1)'],
    ['protokol-göreli', '//tarodan.com.tr/'],
    ['metin değil', 42],
  ])('reddeder: %s', (_n, url) => {
    expect(parseStrictUrl(url)).toBeNull();
  });

  it('http yalnız açıkça izin verilirse; o zaman port 80 atılır', () => {
    expect(parseStrictUrl('http://tarodan.com.tr:80/x', { allowHttp: true })).toMatchObject({
      scheme: 'http',
      host: 'tarodan.com.tr',
    });
    expect(parseStrictUrl('http://tarodan.com.tr:8080/x', { allowHttp: true })).toBeNull();
  });
});

describe('openExternalUrlSafely', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => openURL.mockRestore());

  it('katı https adresini açar', async () => {
    const url = 'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116';
    expect(await openExternalUrlSafely(url)).toBe(true);
    expect(openURL).toHaveBeenCalledWith(url);
  });

  it.each([
    'http://www.suratkargo.com.tr/KargoTakip',
    'intent://scan/#Intent;scheme=zxing;end',
    'tel:+905320000000',
    'javascript:alert(1)',
    'tarodan://banned?reason=x',
    'https://x@evil.example/',
    '',
    null,
  ])('açmaz: %s', async (url) => {
    expect(await openExternalUrlSafely(url)).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('Linking hatasında fırlatmaz', async () => {
    openURL.mockRejectedValueOnce(new Error('no handler'));
    expect(await openExternalUrlSafely('https://example.com/')).toBe(false);
  });
});
