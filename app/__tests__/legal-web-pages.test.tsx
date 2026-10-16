/**
 * Yasal belge ekranları (`/terms`, `/privacy`, `/distance-sales`, `/cookies`,
 * `/seller-agreement`, `/refund-policy`) web'in uygulama modu sayfasını
 * WebView'de açar: Türkçe `/app/<doc>`, İngilizce `/en/app/<doc>`. WebView
 * yalnız `/app/*`'da kalır (diğer linkler sistem tarayıcısında); yükleme
 * hatasında "Tekrar dene" + "Tarayıcıda aç" (normal web sayfası).
 */
import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const mockGoBack = jest.fn();
const mockStopLoading = jest.fn();
const mockWebViewProps: unknown[] = [];
let mockMounts = 0;
jest.mock('react-native-webview', () => {
  const { forwardRef, useEffect, useImperativeHandle, createElement } = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    WebView: forwardRef((props: unknown, ref: unknown) => {
      useImperativeHandle(ref, () => ({ goBack: mockGoBack, stopLoading: mockStopLoading }));
      useEffect(() => {
        mockMounts += 1;
      }, []);
      mockWebViewProps.push(props);
      return createElement(RNView, { testID: 'legal-webview' });
    }),
  };
});

import type { MessageKey } from '@/i18n/lib';
import { ownWebPageUrl } from '@/lib/web';
import TermsScreen from '../terms';
import PrivacyScreen from '../privacy';
import DistanceSalesScreen from '../distance-sales';
import CookiesScreen from '../cookies';
import SellerAgreementScreen from '../seller-agreement';
import RefundPolicyScreen from '../refund-policy';

const SCREENS: Array<[string, React.ComponentType, MessageKey]> = [
  ['terms', TermsScreen, 'legal.termsTitle'],
  ['privacy', PrivacyScreen, 'legal.privacyTitle'],
  ['distance-sales', DistanceSalesScreen, 'legal.distanceSalesTitle'],
  ['cookies', CookiesScreen, 'legal.cookiesTitle'],
  ['seller-agreement', SellerAgreementScreen, 'legal.sellerAgreementTitle'],
  ['refund-policy', RefundPolicyScreen, 'legal.refundPolicyTitle'],
];

/** Testin okuduğu WebView prop'ları. */
interface WebViewTestProps {
  source: { uri: string };
  onShouldStartLoadWithRequest: (req: { url: string; isTopFrame?: boolean; navigationType?: string }) => boolean;
  onNavigationStateChange: (nav: { url?: string; canGoBack?: boolean; loading?: boolean }) => void;
  onError: (e: { nativeEvent: { description: string } }) => void;
  onHttpError: (e: { nativeEvent: { statusCode: number } }) => void;
}

const lastWebView = () => mockWebViewProps[mockWebViewProps.length - 1] as WebViewTestProps;
let openURL: jest.SpyInstance;

beforeEach(async () => {
  mockWebViewProps.length = 0;
  mockMounts = 0;
  mockGoBack.mockClear();
  mockStopLoading.mockClear();
  resetRouterMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await i18n.changeLanguage('tr');
});

afterEach(() => openURL.mockRestore());

describe('yasal belge ekranları — doğru embed adresi', () => {
  it.each(SCREENS)('%s: Türkçe /app/<doc> ve başlık', (doc, Screen, titleKey) => {
    renderWithProviders(<Screen />);
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl(`/app/${doc}`) });
    expect(screen.getByText(i18n.t(titleKey))).toBeOnTheScreen();
    expect(screen.getByTestId(`legal-${doc}`)).toBeOnTheScreen();
  });

  it.each(SCREENS)('%s: İngilizce /en/app/<doc>', async (doc, Screen) => {
    await i18n.changeLanguage('en');
    renderWithProviders(<Screen />);
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl(`/en/app/${doc}`) });
  });
});

describe('yasal belge ekranları — gezinme kuralları', () => {
  const start = (url: string) =>
    lastWebView().onShouldStartLoadWithRequest({ url, isTopFrame: true, navigationType: 'click' });

  it('belgeler arası /app/* linki WebView içinde kalır', () => {
    renderWithProviders(<TermsScreen />);
    expect(start(ownWebPageUrl('/app/privacy'))).toBe(true);
    expect(start(ownWebPageUrl('/en/app/cookies'))).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('embed dışı kendi-site ve dış linkler sistem tarayıcısında açılır', () => {
    renderWithProviders(<PrivacyScreen />);
    expect(start(ownWebPageUrl('/contact'))).toBe(false);
    expect(openURL).toHaveBeenLastCalledWith(ownWebPageUrl('/contact'));
    expect(start('https://example.org/kvkk')).toBe(false);
    expect(openURL).toHaveBeenLastCalledWith('https://example.org/kvkk');
    expect(start('mailto:destek@tarodan.com.tr')).toBe(false);
    expect(openURL).toHaveBeenLastCalledWith('mailto:destek@tarodan.com.tr');
  });

  it('satın alma sayfası hiçbir yoldan açılmaz (ne WebView ne tarayıcı)', () => {
    renderWithProviders(<TermsScreen />);
    expect(start(ownWebPageUrl('/membership'))).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('SPA geçişiyle /app dışına çıkılırsa: tarayıcıda bir kez açılır, WebView belgeye döner', () => {
    renderWithProviders(<TermsScreen />);
    const nav = { url: ownWebPageUrl('/contact'), canGoBack: true, loading: false };
    act(() => lastWebView().onNavigationStateChange(nav));
    act(() => lastWebView().onNavigationStateChange(nav));
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/contact'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    // Belgeye dönüldü; aynı link tekrar tıklanabilir.
    act(() => lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/app/terms'), canGoBack: false }));
    act(() => lastWebView().onNavigationStateChange(nav));
    expect(openURL).toHaveBeenCalledTimes(2);
  });

  it('SPA kaçışında geçmiş yoksa WebView belgeyle yeniden kurulur', () => {
    renderWithProviders(<TermsScreen />);
    expect(mockMounts).toBe(1);
    act(() => lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/about'), canGoBack: false }));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockMounts).toBe(2);
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/app/terms') });
  });
});

describe('yasal belge ekranları — hata durumu', () => {
  it('ağ hatasında "Tekrar dene" + "Tarayıcıda aç"; tarayıcıda normal web sayfası', async () => {
    renderWithProviders(<CookiesScreen />);
    act(() => lastWebView().onError({ nativeEvent: { description: 'offline' } }));

    expect(screen.queryByTestId('legal-webview')).toBeNull();
    expect(screen.getByTestId('own-site-load-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByText(i18n.t('mobile.openInBrowser')));
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/cookies'));

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(screen.getByTestId('legal-webview')).toBeOnTheScreen();
    expect(mockMounts).toBe(2);
  });

  it('İngilizcede "Tarayıcıda aç" /en/<doc> açar', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<RefundPolicyScreen />);
    act(() => lastWebView().onError({ nativeEvent: { description: 'offline' } }));
    fireEvent.press(screen.getByText(i18n.t('mobile.openInBrowser')));
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/en/refund-policy'));
  });

  it('HTTP 4xx/5xx de hata durumuna düşer; 2xx/3xx düşmez', () => {
    renderWithProviders(<SellerAgreementScreen />);
    act(() => lastWebView().onHttpError({ nativeEvent: { statusCode: 304 } }));
    expect(screen.getByTestId('legal-webview')).toBeOnTheScreen();
    act(() => lastWebView().onHttpError({ nativeEvent: { statusCode: 404 } }));
    expect(screen.getByTestId('own-site-load-error')).toBeOnTheScreen();
  });
});
