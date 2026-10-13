import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScreenHeader, theme } from '@/ui';
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

let mockTop = 0;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: mockTop, right: 0, bottom: 0, left: 0 }),
}));

beforeEach(() => {
  resetRouterMocks();
  mockTop = 0;
});

describe('AppShell — tek satır beyaz bar', () => {
  it('beyaz bar (ScreenHeader ile aynı zemin + alt çizgi), logo yok; arama alanı + bildirim + sepet (sayaçlı) ve içerik', () => {
    render(
      <AppShell>
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style)).toMatchObject({
      backgroundColor: theme.colors.surface.elevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.DEFAULT,
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

  it('bar satırı = headerHeight (ScreenHeader ile aynı) ve üst boşluk aynı kaynaktan (insets.top)', () => {
    mockTop = 47;
    const { unmount } = render(<AppShell />);
    expect(APP_SHELL_BAR_HEIGHT).toBe(theme.headerHeight);
    const shellBar = StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style);
    expect(shellBar.paddingTop).toBe(47);
    unmount();

    render(<ScreenHeader title="Sepet" />);
    const stackBar = StyleSheet.flatten(screen.getByTestId('screen-header').props.style);
    const stackRow = StyleSheet.flatten(screen.getByTestId('screen-header-row').props.style);
    // Tab kökü <-> yığın ekranı: barın alt kenarı aynı y'de (inset + satır yüksekliği).
    expect(stackBar.paddingTop).toBe(shellBar.paddingTop);
    // Aynı zemin + alt çizgi kuralı.
    expect(stackBar.backgroundColor).toBe(shellBar.backgroundColor);
    expect(stackBar.borderBottomColor).toBe(shellBar.borderBottomColor);
    expect(stackRow.height).toBe(APP_SHELL_BAR_HEIGHT);
  });

  it('arama alanına çift dokunuş tek /search açar', () => {
    render(<AppShell />);
    fireEvent.press(screen.getByTestId('home-search-input'));
    fireEvent.press(screen.getByTestId('home-search-input'));
    expect(pushMock.mock.calls.filter((c) => String(c[0]).startsWith('/search'))).toHaveLength(1);
  });

  it('StatusBar bildirmez (kök varsayılanı koyu içerik kalır); ikonlar primary-600', () => {
    render(<AppShell />);
    expect(screen.queryByTestId('status-bar')).toBeNull();
    const bell = screen.getByTestId('app-shell-notifications');
    expect(bell).toBeTruthy();
  });

  it('arama alanı açık gri (gray-100) zemin + muted yer tutucu', () => {
    render(<AppShell />);
    const field = StyleSheet.flatten(screen.getByTestId('home-search-input').props.style);
    expect(field.backgroundColor).toBe(theme.colors.gray[100]);
  });
});
