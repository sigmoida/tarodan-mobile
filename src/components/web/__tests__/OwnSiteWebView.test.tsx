/**
 * B4 inceleme 2 · Engelli (satın alma) sayfaya site içi geçişte ekrandan
 * TEK sefer çıkılır. `onNavigationStateChange` aynı adres için birden çok
 * kez gelir; her birinde `router.back()` iki ekran geri giderdi.
 *
 * B4 inceleme tur 2 · 2: geçmiş yoksa (soğuk açılış / derin bağlantı)
 * `router.back()` hiçbir şey yapmaz → ana sekmelere `replace`. Bayrak yalnız
 * çıkış gerçekten yapıldıysa kalkar; WebView her durumda sökülür.
 */
import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import {
  backMock,
  canGoBackMock,
  replaceMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const mockStopLoading = jest.fn();
const mockWebViewProps: Array<Record<string, any>> = [];
jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle, createElement } = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    WebView: forwardRef((props: Record<string, any>, ref: unknown) => {
      useImperativeHandle(ref, () => ({ stopLoading: mockStopLoading }));
      mockWebViewProps.push(props);
      return createElement(RNView, { testID: 'own-site-webview' });
    }),
  };
});

import { ownWebPageUrl } from '@/lib/web';
import { OwnSiteWebView } from '../OwnSiteWebView';

const lastWebView = () => mockWebViewProps[mockWebViewProps.length - 1]!;

beforeEach(() => {
  mockWebViewProps.length = 0;
  mockStopLoading.mockClear();
  resetRouterMocks();
});

describe('OwnSiteWebView · engelli sayfada çıkış', () => {
  it('geçmiş varsa: tekrar olaylarında router.back bir kez, yükleme durdurulur, WebView sökülür', () => {
    canGoBackMock.mockReturnValue(true);
    const onBack = jest.fn();
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" onBack={onBack} />);
    const { onNavigationStateChange } = lastWebView();

    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: true }));
    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: false }));
    act(() => onNavigationStateChange({ url: ownWebPageUrl('/pricing'), loading: false }));

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(mockStopLoading).toHaveBeenCalledTimes(1);
    // Çıkış başlığın `onBack`'ine bağlı değil (router üzerinden).
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.queryByTestId('own-site-webview')).toBeNull();
  });

  it('geçmiş YOKSA (soğuk açılış): ana sekmelere replace, back yok, engelli sayfa ekranda kalmaz', () => {
    canGoBackMock.mockReturnValue(false);
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" />);
    const { onNavigationStateChange } = lastWebView();

    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: true }));
    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: false }));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('own-site-webview')).toBeNull();
  });

  it('çıkış başarısızsa bayrak kalkmaz: sonraki olayda yeniden denenir', () => {
    canGoBackMock.mockReturnValue(false);
    replaceMock.mockImplementationOnce(() => {
      throw new Error('navigator not ready');
    });
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" />);
    const { onNavigationStateChange } = lastWebView();

    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: true }));
    // WebView yine de sökülür — sayfa görünmez.
    expect(screen.queryByTestId('own-site-webview')).toBeNull();
    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: false }));
    act(() => onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: false }));

    expect(replaceMock).toHaveBeenCalledTimes(2);
  });

  it('başlıktaki geri: onBack verilmezse geçmiş yokken ana sekmelere', () => {
    canGoBackMock.mockReturnValue(false);
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" />);
    fireEvent.press(screen.getByLabelText(/geri|back/i));
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('izinli sayfalarda çıkış yok', () => {
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/privacy') });
    lastWebView().onNavigationStateChange({ url: undefined });
    expect(backMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(mockStopLoading).not.toHaveBeenCalled();
    expect(screen.getByTestId('own-site-webview')).toBeOnTheScreen();
  });
});
