/**
 * B4 inceleme 2 · Engelli (satın alma) sayfaya site içi geçişte ekrandan
 * TEK sefer çıkılır. `onNavigationStateChange` aynı adres için birden çok
 * kez gelir; her birinde `onBack()` → `router.back()` iki ekran geri giderdi.
 */
import React from 'react';
import { renderWithProviders } from '@/test-utils';

const mockStopLoading = jest.fn();
const mockWebViewProps: Array<Record<string, any>> = [];
jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    WebView: forwardRef((props: Record<string, any>, ref: unknown) => {
      useImperativeHandle(ref, () => ({ stopLoading: mockStopLoading }));
      mockWebViewProps.push(props);
      return null;
    }),
  };
});

import { ownWebPageUrl } from '@/lib/ads/openAdLink';
import { OwnSiteWebView } from '../OwnSiteWebView';

const lastWebView = () => mockWebViewProps[mockWebViewProps.length - 1]!;

beforeEach(() => {
  mockWebViewProps.length = 0;
  mockStopLoading.mockClear();
});

describe('OwnSiteWebView · engelli sayfada çıkış', () => {
  it('aynı engelli adres için gelen tekrar olaylarında onBack bir kez çağrılır, yükleme durdurulur', () => {
    const onBack = jest.fn();
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" onBack={onBack} />);
    const { onNavigationStateChange } = lastWebView();

    onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: true });
    onNavigationStateChange({ url: ownWebPageUrl('/membership'), loading: false });
    onNavigationStateChange({ url: ownWebPageUrl('/pricing'), loading: false });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockStopLoading).toHaveBeenCalledTimes(1);
  });

  it('izinli sayfalarda çıkış yok', () => {
    const onBack = jest.fn();
    renderWithProviders(<OwnSiteWebView url={ownWebPageUrl('/about')} title="T" onBack={onBack} />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/privacy') });
    lastWebView().onNavigationStateChange({ url: undefined });
    expect(onBack).not.toHaveBeenCalled();
    expect(mockStopLoading).not.toHaveBeenCalled();
  });
});
