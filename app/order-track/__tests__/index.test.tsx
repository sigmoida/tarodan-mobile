/**
 * Misafir sipariş takibi — derin bağlantı ön-doldurması.
 * `app/orders/_components/OrderCard.tsx:65` ve sipariş e-postaları ekrana
 * `/order-track?orderNumber=ORD-…` ile giriyor; ekran bu parametreyi okumazsa
 * kullanıcı numarayı elle yazmak zorunda kalıyor.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const rm = require('@/test-utils/router-mock').routerMock;
  return { ...rm, useLocalSearchParams: () => mockParams };
});

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
}));

import OrderTrackScreen from '../index';

beforeEach(() => {
  mockParams = {};
});

describe('order-track deep link', () => {
  it('prefills the order number from the route parameter', () => {
    mockParams = { orderNumber: 'ORD-1234567890' };

    renderWithProviders(<OrderTrackScreen />);

    expect(screen.getByDisplayValue('ORD-1234567890')).toBeTruthy();
  });

  it('prefills the email when the link carries one', () => {
    mockParams = { orderNumber: 'ORD-1234567890', email: 'alici@example.com' };

    renderWithProviders(<OrderTrackScreen />);

    expect(screen.getByDisplayValue('alici@example.com')).toBeTruthy();
  });

  it('opens empty when no parameter is given', () => {
    renderWithProviders(<OrderTrackScreen />);

    expect(screen.queryByDisplayValue(/ORD-/)).toBeNull();
  });

  it('lets the user overwrite the prefilled number', () => {
    mockParams = { orderNumber: 'ORD-1234567890' };

    renderWithProviders(<OrderTrackScreen />);
    fireEvent.changeText(screen.getByDisplayValue('ORD-1234567890'), 'ORD-9999999999');

    expect(screen.getByDisplayValue('ORD-9999999999')).toBeTruthy();
  });
});
