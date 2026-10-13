/**
 * CMS sayfası WebView'i içerikteki bağlantılarla gezinmemeli: dış bağlantılar
 * sistem tarafından açılır, `javascript:` / özel şemalar engellenir.
 */
import React from 'react';
import { Linking } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { decideCmsNavigation } from '../_lib/navigation';

let mockParams: Record<string, string> = { slug: 'gizlilik' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() },
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

describe('decideCmsNavigation', () => {
  it.each([
    ['about:blank', undefined, 'allow'],
    ['about:blank#bolum-2', undefined, 'allow'],
    ['https://tarodan.com.tr/gizlilik', undefined, 'external'],
    ['http://example.com', true, 'external'],
    ['mailto:destek@tarodan.com.tr', undefined, 'external'],
    ['tel:+902120000000', undefined, 'external'],
    ['javascript:alert(1)', undefined, 'block'],
    ['tarodan://settings', undefined, 'block'],
    ['intent://scan/#Intent;scheme=zxing;end', undefined, 'block'],
    ['data:text/html,<b>x</b>', undefined, 'block'],
    ['file:///etc/passwd', undefined, 'block'],
    ['', undefined, 'block'],
    ['/relative', undefined, 'block'],
    ['https://www.youtube.com/embed/x', false, 'allow'],
    ['javascript:alert(1)', false, 'block'],
  ] as const)('%s (topFrame=%s) -> %s', (url, isTopFrame, expected) => {
    expect(decideCmsNavigation(url, isTopFrame)).toBe(expected);
  });
});

describe('CMS WebView bağlantısı', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    mockWebViewProps.length = 0;
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
  });

  it('ilk HTML yüklemesi (about:blank) serbest, sistem açılmaz', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: 'about:blank' })).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('javascript: ve özel şema ne yüklenir ne sistemde açılır', async () => {
    const props = await lastProps();
    expect(props.onShouldStartLoadWithRequest({ url: 'javascript:alert(1)' })).toBe(false);
    expect(props.onShouldStartLoadWithRequest({ url: 'tarodan://x' })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('Android yeni pencere (target=_blank) kapalı', async () => {
    const props = await lastProps();
    expect(props.setSupportMultipleWindows).toBe(false);
  });
});
