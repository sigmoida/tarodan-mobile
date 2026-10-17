/**
 * Sipariş alındı ekranı (checkout/success): düğme yönlendirmesi + Android geri tuşu ana sayfaya.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders, captureHardwareBack } from '@/test-utils';
import { pushMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

import CheckoutSuccessScreen from '../success';

describe('checkout/success', () => {
  beforeEach(() => resetRouterMocks());

  it('"Siparişlerimi Gör" → /orders replace eder', () => {
    renderWithProviders(<CheckoutSuccessScreen />);
    fireEvent.press(screen.getByText('Siparişlerimi Gör'));
    expect(replaceMock).toHaveBeenCalledWith('/orders');
  });

  it('Android geri tuşu ödeme adımlarına dönmez: ana sayfaya replace eder', () => {
    const back = captureHardwareBack();
    try {
      renderWithProviders(<CheckoutSuccessScreen />);
      expect(back.press()).toBe(true);
      expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      back.restore();
    }
  });
});
