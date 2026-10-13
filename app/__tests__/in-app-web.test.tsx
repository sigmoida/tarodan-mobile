/**
 * B4 · Uygulama içi web ekranı (`OwnSiteWebView`): yalnız kendi sitemiz,
 * satın alma sayfaları engelli, dış link sistem tarayıcısında.
 */
import React from 'react';
import { Linking } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { backMock, resetRouterMocks } from '@/test-utils/router-mock';

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

import { ownWebPageUrl } from '@/lib/web';
import InAppWebScreen from '../in-app-web';

const lastWebView = () => mockWebViewProps[mockWebViewProps.length - 1]!;

beforeEach(() => {
  mockWebViewProps.length = 0;
  mockParams = {};
  resetRouterMocks();
});

describe('Uygulama içi web ekranı', () => {
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

  it('site içi gezinmede satın alma sayfası engellenir, dış link sistem tarayıcısında açılır', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockParams = { url: ownWebPageUrl('/about') };
    renderWithProviders(<InAppWebScreen />);
    const { onShouldStartLoadWithRequest } = lastWebView();
    expect(onShouldStartLoadWithRequest({ url: ownWebPageUrl('/privacy'), isTopFrame: true })).toBe(true);
    expect(onShouldStartLoadWithRequest({ url: ownWebPageUrl('/membership'), isTopFrame: true })).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
    expect(onShouldStartLoadWithRequest({ url: 'https://example.com/', isTopFrame: true })).toBe(false);
    expect(openURL).toHaveBeenCalledWith('https://example.com/');
    openURL.mockRestore();
  });

  it('satın alma sayfasına site içi geçişte router.back', () => {
    mockParams = { url: ownWebPageUrl('/about') };
    renderWithProviders(<InAppWebScreen />);
    lastWebView().onNavigationStateChange({ url: ownWebPageUrl('/membership') });
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
