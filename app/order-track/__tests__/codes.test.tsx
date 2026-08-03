/**
 * Misafir takip — üç kod biçimi (delta §2).
 *
 * Sunucu `ORD-…` (sipariş), `GRP-…` (grup) ve `PKG-…` (teslimat/paket)
 * numaralarının üçünü de çözüyor (canlı doğrulandı: üç biçim de DTO'yu geçip
 * 404 döndü, 400 doğrulama hatası DEĞİL). Ekran yalnız `ORD-XXXXXX`
 * gösteriyordu — hem tek biçim, hem de altı karakter (gerçek biçim on).
 * Yanıttaki `groupNumber` / `packageNumber` da hiçbir yerde basılmıyordu.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const rm = require('@/test-utils/router-mock').routerMock;
  return { ...rm, useLocalSearchParams: () => mockParams };
});

jest.mock('@/lib/api', () => ({ api: { post: jest.fn() } }));

import OrderTrackScreen from '../index';
import { OrderTrackResult } from '../_components/OrderTrackResult';

beforeEach(() => {
  mockParams = {};
});

const order = (extra: Record<string, unknown> = {}) =>
  ({
    id: 'o1',
    orderNumber: 'ORD-1234567890',
    status: 'shipped',
    totalAmount: 754.32,
    createdAt: new Date('2026-08-01').toISOString(),
    product: { title: 'Model', images: [] },
    ...extra,
  }) as any;

describe('guest tracking input', () => {
  it('tells the user all three code formats are accepted', () => {
    renderWithProviders(<OrderTrackScreen />);

    const field = screen.getByPlaceholderText(/ORD-/);
    expect(field.props.placeholder).toMatch(/GRP-/);
    expect(field.props.placeholder).toMatch(/PKG-/);
  });
});

describe('guest tracking result', () => {
  it('shows the delivery number when the server sends one', () => {
    renderWithProviders(<OrderTrackResult order={order({ packageNumber: 'PKG-0987654321' })} />);

    expect(screen.getByText('PKG-0987654321')).toBeTruthy();
    expect(screen.getByText('Teslimat No')).toBeTruthy();
  });

  it('shows the group number when the server sends one', () => {
    renderWithProviders(<OrderTrackResult order={order({ groupNumber: 'GRP-1122334455' })} />);

    expect(screen.getByText('GRP-1122334455')).toBeTruthy();
  });

  it('omits both rows for an order that has neither', () => {
    renderWithProviders(<OrderTrackResult order={order()} />);

    expect(screen.queryByText('Teslimat No')).toBeNull();
    expect(screen.queryByText('Grup No')).toBeNull();
  });
});
