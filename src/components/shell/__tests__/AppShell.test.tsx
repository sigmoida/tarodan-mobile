import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import { AppShell } from '../AppShell';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('expo-status-bar', () => ({ setStatusBarStyle: jest.fn() }));
jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 2, notificationCount: 0 }),
}));

beforeEach(() => resetRouterMocks());

describe('AppShell — web Header telefon görünümü', () => {
  it('primary-500 marka barı, logo, bildirim + sepet (sayaçlı) ve içerik', () => {
    render(
      <AppShell>
        <Text>içerik</Text>
      </AppShell>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-bar').props.style)).toMatchObject({
      backgroundColor: theme.colors.primary[500],
      borderBottomColor: theme.colors.primary[600],
    });
    expect(screen.getByLabelText('Tarodan')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-shell-cart'));
    expect(pushMock).toHaveBeenCalledWith('/cart');
  });

  it('arama satırı ve özel aksiyonlar', () => {
    const onPress = jest.fn();
    render(
      <AppShell search={<Text>ara</Text>} actions={[{ icon: 'heart-outline', label: 'Favoriler', onPress }]} />,
    );
    expect(screen.getByText('ara')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Favoriler'));
    expect(onPress).toHaveBeenCalled();
  });
});
