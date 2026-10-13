/**
 * Bakım ekranı: bilgi ekranı (kapı değil) — "Tekrar dene" ve Android geri tuşu ana sayfaya döner.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders, captureHardwareBack } from '@/test-utils';
import { replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

import MaintenanceScreen from '../maintenance';

describe('maintenance', () => {
  beforeEach(() => resetRouterMocks());

  it('başlık + açıklama + "Tekrar Dene" çizer; düğme ana sayfaya replace eder', () => {
    renderWithProviders(<MaintenanceScreen />);
    expect(screen.getByText('Bakım Çalışması')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });

  it('Android geri tuşu ana sayfaya replace eder (yığında geri/çıkış yok)', () => {
    const back = captureHardwareBack();
    try {
      renderWithProviders(<MaintenanceScreen />);
      expect(back.press()).toBe(true);
      expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
    } finally {
      back.restore();
    }
  });
});
