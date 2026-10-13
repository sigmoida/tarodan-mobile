/**
 * CMS WebView'i içerikteki bağlantılarla gezinmemeli:
 *  - kendi alan adımız ve göreli bağlantılar (`/sayfa/kvkk`) UYGULAMA İÇİNDE açılır;
 *  - eşlenemeyen ya da dış bağlantılar sistem tarayıcısına gider;
 *  - `javascript:` / özel şemalar engellenir.
 */
import React from 'react';
import { Linking } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { decideCmsNavigation } from '../_lib/navigation';

let mockParams: Record<string, string> = { slug: 'gizlilik' };
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    replace: jest.fn(),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

const mockWebViewProps: Array<Record<string, any>> = [];
jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, any>) => {
    mockWebViewProps.push(props);
    return null;
  },
}));

jest.mock('@/lib/api', () => ({
  pagesApi: { getBySlug: jest.fn() },
}));
import { pagesApi } from '@/lib/api';

import CMSPageScreen from '../[slug]';

const WEB = 'https://tarodan.com.tr';

describe('decideCmsNavigation — sayfa kendisi ve dış/şema kararları', () => {
  it.each([
    ['about:blank', undefined, 'allow'],
    ['about:blank#bolum-2', undefined, 'allow'],
    ['#bolum-2', undefined, 'allow'],
    ['https://example.com/x', undefined, 'external'],
    ['http://example.com', true, 'external'],
    ['mailto:destek@tarodan.com.tr', undefined, 'external'],
    ['tel:+902120000000', undefined, 'external'],
    ['javascript:alert(1)', undefined, 'block'],
    ['tarodan://settings', undefined, 'block'],
    ['intent://scan/#Intent;scheme=zxing;end', undefined, 'block'],
    ['data:text/html,<b>x</b>', undefined, 'block'],
    ['file:///etc/passwd', undefined, 'block'],
    ['', undefined, 'block'],
    ['   ', undefined, 'block'],
    ['https://www.youtube.com/embed/x', false, 'allow'],
    ['javascript:alert(1)', false, 'block'],
  ] as const)('%s (topFrame=%s) -> %s', (url, isTopFrame, expected) => {
    expect(decideCmsNavigation(url, isTopFrame).action).toBe(expected);
  });
});

describe('decideCmsNavigation — kendi alan adımız ve göreli bağlantılar uygulamada açılır', () => {
  it.each([
    // mutlak, kendi alan adı
    ['https://tarodan.com.tr/sayfa/kvkk', '/sayfa/kvkk'],
    ['https://www.tarodan.com.tr/sayfa/kvkk', '/sayfa/kvkk'],
    ['https://tarodan.com.tr/en/sayfa/kvkk', '/sayfa/kvkk'],
    ['https://tarodan.com.tr/sayfa/kvkk/', '/sayfa/kvkk'],
    ['https://tarodan.com.tr/sayfa/kvkk#madde-3', '/sayfa/kvkk'],
    ['https://staging.tarodan.com.tr/sayfa/kvkk', '/sayfa/kvkk'],
    ['HTTPS://TARODAN.COM.TR/sayfa/kvkk', '/sayfa/kvkk'],
    ['https://tarodan.com.tr:443/sayfa/kvkk', '/sayfa/kvkk'],
    // push/derin bağlantı eşlemesi paylaşılır
    ['https://tarodan.com.tr/listings/abc', '/product/abc'],
    ['https://tarodan.com.tr/trades/5', '/trade/5'],
    ['https://tarodan.com.tr/en/listings/abc', '/product/abc'],
    // göreli
    ['/sayfa/kvkk', '/sayfa/kvkk'],
    ['/sayfa/kvkk#madde-3', '/sayfa/kvkk'],
    ['/en/sayfa/kvkk', '/sayfa/kvkk'],
    ['sayfa/kvkk', '/sayfa/kvkk'],
    ['//tarodan.com.tr/sayfa/kvkk', '/sayfa/kvkk'],
    ['/listings/abc', '/product/abc'],
    ['/verify-email?token=t1', '/verify-email?token=t1'],
  ])('%s -> uygulama rotası %s', (url, route) => {
    expect(decideCmsNavigation(url, true)).toEqual({ action: 'app', route });
  });

  it('göreli bağlantı sessizce engellenmez (eskiden "block" idi)', () => {
    expect(decideCmsNavigation('/relative').action).not.toBe('block');
    expect(decideCmsNavigation('/sayfa/kvkk').action).not.toBe('block');
  });

  it('eşlenemeyen kendi-alan bağlantısı sistem tarayıcısına düşer (mutlak URL ile)', () => {
    expect(decideCmsNavigation('https://tarodan.com.tr/gizlilik')).toEqual({
      action: 'external',
      url: 'https://tarodan.com.tr/gizlilik',
    });
    // Göreli + eşlenemez: tarayıcıya verilebilmesi için web adresine çözülür.
    expect(decideCmsNavigation('/gizlilik-politikasi?x=1')).toEqual({
      action: 'external',
      url: `${WEB}/gizlilik-politikasi?x=1`,
    });
  });

  it('ödeme dönüşü uygulamaya çekilmez, tarayıcıda kalır', () => {
    expect(decideCmsNavigation('https://tarodan.com.tr/payment/success').action).toBe('external');
    expect(decideCmsNavigation('/payment/fail').action).toBe('external');
  });

  it('kendi alan adı gibi görünen yabancı host uygulamada AÇILMAZ', () => {
    for (const url of [
      'https://tarodan.com.tr.evil.com/sayfa/kvkk',
      'https://eviltarodan.com.tr/sayfa/kvkk',
      'https://tarodan.com.tr@evil.com/sayfa/kvkk',
      'https://tarodan.com.tr\\@evil.com/sayfa/kvkk',
      'https://evil.com/sayfa/kvkk',
    ]) {
      expect(decideCmsNavigation(url)).toEqual({ action: 'external', url });
    }
  });

  it('bozuk yüzde-kodlu thread parametresi atmaz, tarayıcıya düşer', () => {
    expect(() => decideCmsNavigation('/messages?thread=%E0%A4%A')).not.toThrow();
  });

  it('iframe: göreli ve uygulama bağlantıları iframe\'den açılmaz', () => {
    expect(decideCmsNavigation('/sayfa/kvkk', false).action).toBe('block');
    expect(decideCmsNavigation('mailto:a@b.co', false).action).toBe('block');
  });

  describe('web adresi EXPO_PUBLIC_WEB_URL\'den (staging)', () => {
    const prev = process.env.EXPO_PUBLIC_WEB_URL;
    beforeEach(() => {
      process.env.EXPO_PUBLIC_WEB_URL = 'https://staging.tarodan.com.tr/';
    });
    afterEach(() => {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_WEB_URL;
      else process.env.EXPO_PUBLIC_WEB_URL = prev;
    });

    it('eşlenemeyen göreli bağlantı staging adresine çözülür', () => {
      expect(decideCmsNavigation('/gizlilik')).toEqual({
        action: 'external',
        url: 'https://staging.tarodan.com.tr/gizlilik',
      });
    });
  });
});

describe('CMS WebView bağlantısı', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    mockWebViewProps.length = 0;
    mockPush.mockClear();
    mockParams = { slug: 'gizlilik' };
    (pagesApi.getBySlug as jest.Mock).mockResolvedValue({
      data: { data: { id: 'p1', slug: 'gizlilik', title: 'Gizlilik', content: '<a href="https://x.y">x</a>' } },
    });
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });
  afterEach(() => openURL.mockRestore());

  const lastProps = async () => {
    renderWithProviders(<CMSPageScreen />);
    await waitFor(() => expect(screen.getByText('Gizlilik')).toBeOnTheScreen());
    return mockWebViewProps[mockWebViewProps.length - 1]!;
  };

  it('dış bağlantı WebView içinde yüklenmez, sistemde açılır', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: 'https://x.y', isTopFrame: true })).toBe(false);
    expect(openURL).toHaveBeenCalledWith('https://x.y');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('göreli /sayfa/kvkk uygulama içinde açılır, tarayıcı açılmaz', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: '/sayfa/kvkk', isTopFrame: true })).toBe(false);
    expect(mockPush).toHaveBeenCalledWith('/sayfa/kvkk');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('kendi alan adımızdaki bağlantı uygulama içinde açılır', async () => {
    const props = await lastProps();
    expect(
      props.onShouldStartLoadWithRequest({ url: 'https://tarodan.com.tr/sayfa/kvkk', isTopFrame: true }),
    ).toBe(false);
    expect(mockPush).toHaveBeenCalledWith('/sayfa/kvkk');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('eşlenemeyen kendi-alan bağlantısı sistem tarayıcısına düşer', async () => {
    const props = await lastProps();
    props.onShouldStartLoadWithRequest({ url: 'https://tarodan.com.tr/gizlilik', isTopFrame: true });
    expect(openURL).toHaveBeenCalledWith('https://tarodan.com.tr/gizlilik');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ilk HTML yüklemesi (about:blank) serbest, sistem açılmaz', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: 'about:blank' })).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('javascript: ve özel şema ne yüklenir ne açılır', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: 'javascript:alert(1)' })).toBe(false);
    expect(props.onShouldStartLoadWithRequest({ url: 'tarodan://x' })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Android yeni pencere (target=_blank) kapalı', async () => {
    const props = await lastProps();
    expect(props.setSupportMultipleWindows).toBe(false);
  });
});
