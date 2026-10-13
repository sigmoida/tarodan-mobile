import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import { AppShell, APP_SHELL_BAR_HEIGHT } from '../AppShell';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style?: string }) => {
    const { Text: T } = require('react-native');
    return <T testID="status-bar">{style}</T>;
  },
  setStatusBarStyle: jest.fn(),
}));
jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 2, notificationCount: 0, messageCount: 0, favoriteCount: 0 }),
}));

beforeEach(() => resetRouterMocks());

describe('AppShell — tek satır marka barı', () => {
  it('primary-600 bar, logo yok; arama alanı + bildirim + sepet (sayaçlı) ve içerik', () => {
    render(
      <AppShell>
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style)).toMatchObject({
      backgroundColor: theme.colors.primary[600],
    });
    expect(screen.queryByLabelText('Tarodan')).toBeNull();
    expect(screen.getByTestId('home-search-input')).toBeTruthy();
    expect(screen.getByTestId('app-shell-notifications')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-shell-cart'));
    expect(pushMock).toHaveBeenCalledWith('/cart');
  });

  it('arama alanı sahte alandır: dokununca /search?focus=1 açar', () => {
    render(<AppShell />);
    fireEvent.press(screen.getByTestId('home-search-input'));
    expect(pushMock).toHaveBeenCalledWith('/search?focus=1');
  });

  it('bar yüksekliği tüm sekme köklerinde aynı sabit (ikon kutusu + dikey boşluk)', () => {
    render(<AppShell />);
    expect(APP_SHELL_BAR_HEIGHT).toBe(theme.minTouchTarget + theme.spacing[2] * 2);
  });

  it('odaktayken StatusBar açık içerik (bildirimsel)', () => {
    render(<AppShell />);
    expect(screen.getByTestId('status-bar').props.children).toBe('light');
  });
});
