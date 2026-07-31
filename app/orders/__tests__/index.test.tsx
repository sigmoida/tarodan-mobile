/**
 * J62/J64 · Siparişlerim listesi — mobil UI dilimi.
 * Liste render, boş durum, rol/filtre chip'leri, durum rozeti metni,
 * değerlendirme butonu görünürlüğü (alıcı + delivered/completed; yeni escrow
 * kuralı: ayrı "Teslim Aldım" onay butonu YOK, ödeme teslim+14 gün sonra
 * otomatik serbest kalır — bkz. OrderCard.tsx), sipariş kartına navigasyon wiring.
 * Backend onay/iade/escrow aktarımı backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));
import { router } from 'expo-router';
const pushMock = router.push as jest.Mock;

jest.mock('@/lib/api', () => ({
  ordersApi: {
    getAll: jest.fn(),
    getGroups: jest.fn(),
    confirm: jest.fn(),
    confirmReceipt: jest.fn(),
  },
}));
import { ordersApi } from '@/lib/api';

let mockAuth = { isAuthenticated: true };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuth,
}));

import OrdersScreen from '../index';

// Varsayılan filtre ("Tümü") gruplu listeyi (ordersApi.getGroups) kullanır —
// bkz. app/orders/_hooks/useOrders.ts `useGroupedList`. ordersApi.getAll yalnızca
// diğer filtre sekmelerinde çağrılır.
const getGroupsMock = ordersApi.getGroups as jest.Mock;

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'TRD-1001',
    status: 'delivered',
    totalAmount: 350,
    product: { id: 'p1', title: 'Deri Ceket', images: [{ url: 'http://x/y.jpg' }] },
    seller: { id: 'seller-1', displayName: 'Mehmet' },
    createdAt: new Date('2026-01-01').toISOString(),
    isBuyer: true,
    ...overrides,
  };
}

// Tek ürünlü grup — hook bunu düz sipariş kartına indirger (kind: 'order').
function orderGroupFixture(overrides: Record<string, unknown> = {}) {
  const order = orderFixture(overrides);
  return {
    id: `group-${order.id}`,
    groupNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
    orders: [order],
  };
}

describe('J62 · Siparişlerim listesi', () => {
  beforeEach(() => {
    getGroupsMock.mockReset();
    pushMock.mockReset();
    mockAuth = { isAuthenticated: true };
  });

  it('J62.1 boş durumda "Henüz siparişiniz yok" ve keşfet butonu gösterir', async () => {
    getGroupsMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<OrdersScreen />);
    await waitFor(() =>
      expect(screen.getByText('Henüz siparişiniz yok')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Ürünleri Keşfet')).toBeOnTheScreen();
  });

  it('J62.2 giriş yapılmamışsa giriş çağrısı ekranı gösterir', () => {
    mockAuth = { isAuthenticated: false };
    renderWithProviders(<OrdersScreen />);
    expect(screen.getByText('Siparişlerinizi görmek için giriş yapın')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('J64.1 sipariş listelenir, durum rozeti ve fiyat görünür', async () => {
    getGroupsMock.mockResolvedValue({ data: { data: [orderGroupFixture()] } });
    renderWithProviders(<OrdersScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #TRD-1001')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Deri Ceket')).toBeOnTheScreen();
    // "Teslim Edildi" hem filtre chip'i hem durum rozetinde geçer
    expect(screen.getAllByText('Teslim Edildi').length).toBeGreaterThan(0);
  });

  it('J64.2 alıcı + delivered → değerlendirme butonları görünür (ayrı teslim-onay butonu yok)', async () => {
    getGroupsMock.mockResolvedValue({ data: { data: [orderGroupFixture({ status: 'delivered', isBuyer: true })] } });
    renderWithProviders(<OrdersScreen />);
    await waitFor(() =>
      expect(screen.getByText('Ürünü Değerlendir')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Satıcıyı Değerlendir')).toBeOnTheScreen();
    // Yeni escrow kuralı: ödeme otomatik serbest kaldığı için ayrı bir
    // teslim-onay butonu artık YOK (bkz. OrderCard.tsx).
    expect(screen.queryByText('Teslim Aldım')).toBeNull();
  });

  it('J64.3 satıcı görünümünde değerlendirme butonları görünmez (canRateOrder yalnızca alıcı)', async () => {
    getGroupsMock.mockResolvedValue({ data: { data: [orderGroupFixture({ status: 'delivered', isBuyer: false })] } });
    renderWithProviders(<OrdersScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #TRD-1001')).toBeOnTheScreen(),
    );
    expect(screen.queryByText('Ürünü Değerlendir')).toBeNull();
    expect(screen.queryByText('Teslim Aldım')).toBeNull();
  });

  it('J62.3 sipariş kartına dokununca detay sayfasına gider', async () => {
    getGroupsMock.mockResolvedValue({ data: { data: [orderGroupFixture()] } });
    renderWithProviders(<OrdersScreen />);
    await waitFor(() =>
      expect(screen.getByText('Sipariş #TRD-1001')).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByText('Deri Ceket'));
    expect(pushMock).toHaveBeenCalledWith('/orders/order-1');
  });
});
