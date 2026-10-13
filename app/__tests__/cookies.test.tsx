/**
 * B4 · Çerez politikası tek kaynaktan: web sayfası uygulama içi web ekranında
 * (`OwnSiteWebView`). Eski "Ocak 2026" tarihli yerel kopya gösterilmez; rota
 * `/cookies` olarak kalır (menü + onay kapısı bağlantısı + `isLegalTextPath`).
 * `app/in-app-web.tsx` aynı bileşene taşındı — davranışı burada da sabitlenir.
 */
import React from 'react';
import { Linking } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { replaceMock, backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

const mockWebViewProps: Array<Record<string, any>> = [];
jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, any>) => {
    mockWebViewProps.push(props);
    return null;
  },
}));

let mockLanguage = 'tr';
jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => {
      const r = actual.useTranslation();
      return { ...r, i18n: { ...r.i18n, language: mockLanguage } };
    },
  };
});

import { ownWebPageUrl } from '@/lib/ads/openAdLink';
import { cookiePolicyUrl } from '@/lib/legal/cookiePolicy';
import { isLegalTextPath } from '@/lib/shared/legalConsent';
import CookiePolicyScreen from '../cookies';
import InAppWebScreen from '../in-app-web';

const lastWebView = () => mockWebViewProps[mockWebViewProps.length - 1]!;

beforeEach(() => {
  mockWebViewProps.length = 0;
  mockLanguage = 'tr';
  mockParams = {};
  resetRouterMocks();
});

describe('cookiePolicyUrl', () => {
  it('Türkçe öneksiz, İngilizce /en (web localePrefix: as-needed)', () => {
    expect(cookiePolicyUrl('tr')).toBe(ownWebPageUrl('/cookies'));
    expect(cookiePolicyUrl('en')).toBe(ownWebPageUrl('/en/cookies'));
    expect(cookiePolicyUrl(undefined)).toBe(ownWebPageUrl('/cookies'));
  });
});

describe('Çerez politikası ekranı', () => {
  it('web sayfasını uygulama içinde açar; eski yerel metin yok', () => {
    renderWithProviders(<CookiePolicyScreen />);
    expect(screen.getByText('Çerez Politikası')).toBeOnTheScreen();
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/cookies') });
    expect(screen.queryByText(/Ocak 2026/)).toBeNull();
  });

  it('İngilizcede web sayfasının /en sürümü', () => {
    mockLanguage = 'en';
    renderWithProviders(<CookiePolicyScreen />);
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/en/cookies') });
  });

  it('satın alma sayfasına geçişte ekrandan çıkar: yığın yoksa ana sayfaya, varsa bir geri', () => {
    renderWithProviders(<CookiePolicyScreen />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/membership') });
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');

    canGoBackMock.mockReturnValue(true);
    renderWithProviders(<CookiePolicyScreen />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/pricing') });
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('site içi gezinmede satın alma sayfası engellenir, dış link sistem tarayıcısında açılır', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<CookiePolicyScreen />);
    const { onShouldStartLoadWithRequest } = lastWebView();
    expect(onShouldStartLoadWithRequest({ url: ownWebPageUrl('/privacy'), isTopFrame: true })).toBe(true);
    expect(onShouldStartLoadWithRequest({ url: ownWebPageUrl('/membership'), isTopFrame: true })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    expect(onShouldStartLoadWithRequest({ url: 'https://example.com/', isTopFrame: true })).toBe(false);
    expect(openURL).toHaveBeenCalledWith('https://example.com/');
    openURL.mockRestore();
  });

  it('rota yasal metin yolu olarak kalır (onay kapısı bu sayfada gizlenir)', () => {
    expect(isLegalTextPath('/cookies')).toBe(true);
  });
});

describe('Uygulama içi web ekranı (aynı bileşen)', () => {
  it('kendi sitemizin adresini açar, başlık "Tarodan"', () => {
    mockParams = { url: ownWebPageUrl('/about') };
    renderWithProviders(<InAppWebScreen />);
    expect(screen.getByText('Tarodan')).toBeOnTheScreen();
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/about') });
  });

  it('yabancı host ya da satın alma adresi yüklenmez', () => {
    mockParams = { url: 'https://evil.example/cookies' };
    renderWithProviders(<InAppWebScreen />);
    expect(mockWebViewProps).toHaveLength(0);

    mockParams = { url: ownWebPageUrl('/membership') };
    renderWithProviders(<InAppWebScreen />);
    expect(mockWebViewProps).toHaveLength(0);
  });

  it('satın alma sayfasına site içi geçişte router.back', () => {
    mockParams = { url: ownWebPageUrl('/about') };
    renderWithProviders(<InAppWebScreen />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/membership') });
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
