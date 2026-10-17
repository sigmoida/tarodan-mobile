/**
 * Yasal belge ekranları (`/terms`, `/privacy`, `/distance-sales`, `/cookies`,
 * `/seller-agreement`, `/refund-policy`) web'in uygulama modu sayfasını
 * WebView'de açar: Türkçe `/app/<doc>`, İngilizce `/en/app/<doc>`. WebView
 * yalnız `/app/*`'da kalır (diğer linkler sistem tarayıcısında); yükleme
 * hatasında "Tekrar dene" + "Tarayıcıda aç" (aynı uygulama modu adresi).
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
  originWhitelist: string[];
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

  it('her adres karar kapısından geçer (originWhitelist hepsi)', () => {
    renderWithProviders(<TermsScreen />);
    expect(lastWebView().originWhitelist).toEqual(['*']);
    expect(start('sms:+905550000000')).toBe(false);
    expect(start('itms-apps://apps.apple.com/app/id1')).toBe(false);
    expect(start('intent://x#Intent;end')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    expect(start('tel:+902324334142')).toBe(false);
    expect(openURL).toHaveBeenLastCalledWith('tel:+902324334142');
  });
});

describe('yasal belge ekranları — SPA kaçışı (/app dışına site içi geçiş)', () => {
  const nav = (path: string, extra: Record<string, unknown> = {}) => ({
    url: ownWebPageUrl(path),
    canGoBack: true,
    loading: false,
    ...extra,
  });

  it('hedef tarayıcıda bir kez açılır; WebView goBack DEĞİL belge adresiyle yeniden kurulur', () => {
    renderWithProviders(<TermsScreen />);
    const old = lastWebView();
    // Aynı geçiş için gelen tekrar olaylar (yükleme başladı / bitti / başlık).
    act(() => old.onNavigationStateChange(nav('/contact', { loading: true })));
    act(() => old.onNavigationStateChange(nav('/contact')));
    act(() => old.onNavigationStateChange(nav('/contact')));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/contact'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockMounts).toBe(2);
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/app/terms') });
    expect(screen.queryByTestId('own-site-load-error')).toBeNull();
  });

  it('kaçış öncesi açık olan belgeye döner (belgeler arası gezinme korunur)', () => {
    renderWithProviders(<TermsScreen />);
    act(() => lastWebView().onNavigationStateChange(nav('/app/privacy')));
    act(() => lastWebView().onNavigationStateChange(nav('/about')));
    expect(lastWebView().source).toEqual({ uri: ownWebPageUrl('/app/privacy') });
  });

  it('yeniden kurulduktan sonra AYNI kaçış tekrar olursa döngü yok: hata durumu, tarayıcı yeniden açılmaz', () => {
    renderWithProviders(<TermsScreen />);
    act(() => lastWebView().onNavigationStateChange(nav('/contact')));
    expect(mockMounts).toBe(2);
    // Yeni WebView belgeyi yükledi, sonra yine /contact'a kaçtı (ör. istemci yönlendirmesi).
    act(() => lastWebView().onNavigationStateChange(nav('/app/terms')));
    act(() => lastWebView().onNavigationStateChange(nav('/contact')));

    expect(mockMounts).toBe(2);
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('own-site-load-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('legal-webview')).toBeNull();

    // "Tekrar dene" belgeyi yeniden kurar; döngü sayacı sıfırlanır.
    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(screen.getByTestId('legal-webview')).toBeOnTheScreen();
    expect(mockMounts).toBe(3);
  });

  it('farklı hedefe kaçış ayrı sayılır (her biri bir kez tarayıcıda)', () => {
    renderWithProviders(<TermsScreen />);
    act(() => lastWebView().onNavigationStateChange(nav('/contact')));
    act(() => lastWebView().onNavigationStateChange(nav('/app/terms')));
    act(() => lastWebView().onNavigationStateChange(nav('/about')));
    expect(openURL.mock.calls.map((c) => c[0])).toEqual([ownWebPageUrl('/contact'), ownWebPageUrl('/about')]);
    expect(mockMounts).toBe(3);
    expect(screen.queryByTestId('own-site-load-error')).toBeNull();
  });
});

describe('yasal belge ekranları — hata durumu', () => {
  it('ağ hatasında "Tekrar dene" + "Tarayıcıda aç"; tarayıcıda AYNI uygulama modu adresi', async () => {
    renderWithProviders(<CookiesScreen />);
    act(() => lastWebView().onError({ nativeEvent: { description: 'offline' } }));

    expect(screen.queryByTestId('legal-webview')).toBeNull();
    expect(screen.getByTestId('own-site-load-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByText(i18n.t('mobile.openInBrowser')));
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/app/cookies'));

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(screen.getByTestId('legal-webview')).toBeOnTheScreen();
    expect(mockMounts).toBe(2);
  });

  it('İngilizcede "Tarayıcıda aç" /en/app/<doc> açar', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<RefundPolicyScreen />);
    act(() => lastWebView().onError({ nativeEvent: { description: 'offline' } }));
    fireEvent.press(screen.getByText(i18n.t('mobile.openInBrowser')));
    expect(openURL).toHaveBeenCalledWith(ownWebPageUrl('/en/app/refund-policy'));
  });

  it('HTTP 4xx/5xx de hata durumuna düşer; 2xx/3xx düşmez', () => {
    renderWithProviders(<SellerAgreementScreen />);
    act(() => lastWebView().onHttpError({ nativeEvent: { statusCode: 304 } }));
    expect(screen.getByTestId('legal-webview')).toBeOnTheScreen();
    act(() => lastWebView().onHttpError({ nativeEvent: { statusCode: 404 } }));
    expect(screen.getByTestId('own-site-load-error')).toBeOnTheScreen();
  });
});
