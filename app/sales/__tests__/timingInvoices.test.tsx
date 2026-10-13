/**
 * Parite A-3.1 · Satış detayı (satıcı tarafı).
 *  - Kargoya verme son tarihi; süre bir kez uzatıldıysa "son süre" uyarısı
 *    (web aynı sipariş sayfasında satıcıya `PreparingDeadlineNotice` gösterir).
 *  - Ödeme zaman aşımı iptal cümlesindeki saat politikadan gelir.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'sale-1' }),
}));

jest.mock('@/lib/api', () => ({
  ordersApi: { getOne: jest.fn(), cancel: jest.fn() },
  timingRulesApi: { getPolicy: jest.fn() },
}));
import { ordersApi, timingRulesApi } from '@/lib/api';
import SaleDetailScreen from '../[id]';

const DAY_MS = 86_400_000;
const getOneMock = ordersApi.getOne as jest.Mock;
const policyMock = timingRulesApi.getPolicy as jest.Mock;

function saleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    orderNumber: 'ORD-2001000000',
    status: 'paid',
    totalAmount: 350,
    createdAt: new Date('2026-01-01').toISOString(),
    buyer: { id: 'buyer-1', displayName: 'Ayşe' },
    items: [{ id: 'i1', price: 320, quantity: 1, product: { id: 'p1', title: 'Deri Ceket' } }],
    ...overrides,
  };
}

const serve = (overrides: Record<string, unknown> = {}) =>
  getOneMock.mockResolvedValue({ data: { data: saleFixture(overrides) } });

beforeEach(() => {
  getOneMock.mockReset();
  policyMock.mockReset();
  policyMock.mockRejectedValue(new Error('offline'));
});

describe('A-3.1 · satıcıya kargoya verme son tarihi', () => {
  it('normal süre: satıcı metni', async () => {
    serve({ preparingDeadline: new Date(Date.now() + 2 * DAY_MS).toISOString() });
    renderWithProviders(<SaleDetailScreen />);
    expect(await screen.findByTestId('preparing-deadline-notice')).toBeOnTheScreen();
    expect(screen.getByText('Siparişi bu tarihe kadar kargoya vermeniz gerekiyor.')).toBeOnTheScreen();
  });

  it('uzatılmış süre: "son süre" uyarısı', async () => {
    serve({
      status: 'preparing',
      preparingDeadline: new Date(Date.now() + 2 * DAY_MS).toISOString(),
      preparingExtendedAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    renderWithProviders(<SaleDetailScreen />);
    expect(await screen.findByTestId('preparing-deadline-extended')).toBeOnTheScreen();
    expect(screen.getByText(/Bu son süredir;/)).toBeOnTheScreen();
  });

  it('koli taşıyıcıdaysa not yok', async () => {
    serve({
      status: 'preparing',
      preparingDeadline: new Date(Date.now() + 2 * DAY_MS).toISOString(),
      shipment: { status: 'picked_up', trackingNumber: 'PKG-1', shippedAt: null },
    });
    renderWithProviders(<SaleDetailScreen />);
    await screen.findByText('Deri Ceket');
    expect(screen.queryByTestId('preparing-deadline-notice')).toBeNull();
  });
});

describe('A-3.1 · ödeme zaman aşımı cümlesi politikadan', () => {
  it('orderPaymentWindowHours = 48 → "48 saat"', async () => {
    policyMock.mockResolvedValue({ data: { orderPaymentWindowHours: { value: 48, unit: 'hours' } } });
    serve({ status: 'cancelled', cancelCategory: 'payment_timeout' });
    renderWithProviders(<SaleDetailScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('sales-cancel-message')).toHaveTextContent(
        'Ödeme 48 saat içinde tamamlanmadığı için sipariş otomatik iptal edildi.',
      ),
    );
  });
});
