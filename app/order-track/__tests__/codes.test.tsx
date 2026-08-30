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

/**
 * Misafir/alıcı takip kartı — `PKG-` HİÇ GÖSTERİLMEZ.
 *
 * `POST /orders/guest/track` yalnız `shipment.trackingNumber`'ı döndürüyor
 * (backend `order-query.service.ts#trackGuestOrder`, 2026-08-11 okuması):
 * bu Tarodan iç referansı, satıcının şubede vereceği numara — Sürat onu
 * TANIMAZ. Uç gerçek Sürat kodunu (`providerTrackingId`/`cargoCode`) hiç
 * göndermiyor, o yüzden bu ekranda takip numarası GÖSTERİLEMEZ; durum
 * gösterilir. Uç kodu göndermeye başlayınca burası kodu basacak şekilde
 * genişletilmeli (backend maddesi).
 */
describe('guest tracking · shipment numbers', () => {
  const shipped = (shipment: Record<string, unknown>) =>
    renderWithProviders(<OrderTrackResult order={order({ shipment })} />);

  it('never prints the internal PKG- reference as a tracking number', () => {
    shipped({ provider: 'surat', trackingNumber: 'PKG-3BQ2W4JPJ3', status: 'in_transit' });

    expect(screen.queryByText(/PKG-/)).toBeNull();
    expect(screen.queryByText('Takip Numarası')).toBeNull();
  });

  it('shows the shipment status in words instead', () => {
    shipped({ provider: 'surat', trackingNumber: 'PKG-3BQ2W4JPJ3', status: 'in_transit' });

    expect(screen.getByTestId('track-shipment-status')).toBeOnTheScreen();
    expect(screen.getByText('Yolda')).toBeOnTheScreen();
  });

  it('never prints a raw status code', () => {
    shipped({ provider: 'surat', trackingNumber: 'PKG-3BQ2W4JPJ3', status: 'at_delivery_branch' });

    expect(screen.queryByText('at_delivery_branch')).toBeNull();
    expect(screen.getByText('Dağıtım şubesinde')).toBeOnTheScreen();
  });

  it('explains the wait while the parcel is still with the seller', () => {
    shipped({ provider: 'surat', trackingNumber: 'PKG-3BQ2W4JPJ3', status: 'label_created' });

    expect(screen.getByText(/Satıcı paketinizi hazırlıyor/)).toBeOnTheScreen();
  });

  it('drops the wait note once the parcel is moving', () => {
    shipped({ provider: 'surat', trackingNumber: 'PKG-3BQ2W4JPJ3', status: 'out_for_delivery' });

    expect(screen.queryByText(/Satıcı paketinizi hazırlıyor/)).toBeNull();
  });
});
