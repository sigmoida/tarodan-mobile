/**
 * Parite A-3.1 · Sipariş detayı ekranında süreler.
 *
 * - İade butonu sunucunun `returnWindowEndsAt` damgasına bağlı (sabit 14 gün
 *   15. günde gizliyordu, sunucu kabul ederken).
 * - Gün/saat sayıları `GET /timing-rules`'tan gelir (metinde sabit 14/24 yok).
 * - Satıcı ödeme tarihi sunucunun `escrowReleaseAt`'i.
 * - Hazırlık son tarihi ve tek seferlik uzatma notu (web `PreparingDeadlineNotice`).
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'order-1' }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  ordersApi: { cancel: jest.fn() },
  refundsApi: { create: jest.fn(), cancel: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
  paymentsApi: { initiate: jest.fn() },
  timingRulesApi: { getPolicy: jest.fn() },
  elogoInvoicesApi: { byOrder: jest.fn(() => Promise.resolve({ data: null })), pdf: jest.fn() },
  sellerInvoiceApi: { status: jest.fn(() => Promise.resolve({ data: null })), download: jest.fn() },
}));
import { api, timingRulesApi } from '@/lib/api';
import OrderDetailScreen from '../[id]';

const DAY_MS = 86_400_000;
const getMock = api.get as jest.Mock;
const policyMock = timingRulesApi.getPolicy as jest.Mock;

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1001000000',
    status: 'delivered',
    totalAmount: 350,
    shippingCost: 30,
    product: { id: 'p1', title: 'Deri Ceket', price: 320, condition: 'used', images: [] },
    seller: { id: 'seller-1', displayName: 'Mehmet' },
    shippingAddress: { fullName: 'Ayşe', phone: '0500', address: 'Sokak 1', city: 'İstanbul' },
    createdAt: new Date('2026-01-01').toISOString(),
    isBuyer: true,
    payment: { status: 'completed' },
    activeRefundRequest: null,
    ...overrides,
  };
}

const serveOrder = (overrides: Record<string, unknown> = {}) =>
  getMock.mockResolvedValue({ data: { data: orderFixture(overrides) } });

beforeEach(() => {
  getMock.mockReset();
  policyMock.mockReset();
  policyMock.mockRejectedValue(new Error('offline')); // varsayılan: geri düşüş politikası
});

describe('A-3.1 · iade butonu sunucu damgasına bağlı', () => {
  it('teslimden 20 gün sonra, damga açıksa "İade Talep Et" GÖRÜNÜR (sabit 14 gün gizliyordu)', async () => {
    serveOrder({
      deliveredAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
      returnWindowEndsAt: new Date(Date.now() + DAY_MS).toISOString(),
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByTestId('refund-request-button')).toBeOnTheScreen();
    expect(screen.queryByText('İade Süresi Doldu')).toBeNull();
  });

  it('damga geçmişse buton yok; metin gün sayısını POLİTİKADAN alır', async () => {
    policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 30, unit: 'days' } } });
    serveOrder({
      deliveredAt: new Date(Date.now() - 40 * DAY_MS).toISOString(),
      returnWindowEndsAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText('30 günlük iade süresi doldu; bu sipariş için artık iade talebi oluşturulamaz.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });

  it('damgasız eski siparişte pencere politikayla hesaplanır (30 gün → 20. gün açık)', async () => {
    policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 30, unit: 'days' } } });
    serveOrder({ deliveredAt: new Date(Date.now() - 20 * DAY_MS).toISOString(), returnWindowEndsAt: null });
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByTestId('refund-request-button')).toBeOnTheScreen();
    expect(
      screen.getByText('Teslimattan sonra 30 gün içinde sebep belirtmeden iade talep edebilirsiniz.'),
    ).toBeOnTheScreen();
  });

  it('politika yüklenemezse geri düşüş (14 gün) metinde', async () => {
    serveOrder({ deliveredAt: new Date(Date.now() - 2 * DAY_MS).toISOString() });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText('Teslimattan sonra 14 gün içinde sebep belirtmeden iade talep edebilirsiniz.'),
    ).toBeOnTheScreen();
  });
});

describe('A-3.1 · satıcı ödeme tarihi sunucudan', () => {
  it("escrow kartı sunucunun escrowReleaseAt'ini ve politikanın gün sayısını basar", async () => {
    policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 21, unit: 'days' } } });
    const release = '2026-02-05T09:00:00.000Z';
    serveOrder({ deliveredAt: '2026-01-10T09:00:00.000Z', escrowReleaseAt: release });
    renderWithProviders(<OrderDetailScreen />);
    const expectedDate = new Date(release).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(
      await screen.findByText(
        `Satıcıya ödeme teslimden 21 gün sonra serbest bırakılır (${expectedDate}). O tarihe kadar iade talep edebilirsiniz.`,
      ),
    ).toBeOnTheScreen();
  });
});

describe('A-3.1 · hazırlık son tarihi notu', () => {
  const future = () => new Date(Date.now() + 2 * DAY_MS).toISOString();

  it('kargo öncesi siparişte alıcıya son tarih notu', async () => {
    serveOrder({ status: 'preparing', deliveredAt: null, preparingDeadline: future() });
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByTestId('preparing-deadline-notice')).toBeOnTheScreen();
    expect(
      screen.getByText('Satıcının siparişi en geç bu tarihe kadar kargoya vermesi gerekiyor.'),
    ).toBeOnTheScreen();
  });

  it('süre bir kez uzatıldıysa alıcıya gecikme + iptal hakkı metni', async () => {
    serveOrder({
      status: 'paid',
      deliveredAt: null,
      preparingDeadline: future(),
      preparingExtendedAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByTestId('preparing-deadline-extended')).toBeOnTheScreen();
    expect(screen.getByText(/^Kargo süresi bir kez uzatıldı — yeni son tarih: /)).toBeOnTheScreen();
    expect(screen.getByText(/Kargoya verilene kadar siparişi iptal edebilirsiniz\.$/)).toBeOnTheScreen();
  });

  it('kargoya verilmiş siparişte not yok', async () => {
    serveOrder({ status: 'shipped', preparingDeadline: future(), shippedAt: new Date().toISOString() });
    renderWithProviders(<OrderDetailScreen />);
    await screen.findByText('Sipariş #ORD-1001000000');
    expect(screen.queryByTestId('preparing-deadline-notice')).toBeNull();
    expect(screen.queryByTestId('preparing-deadline-extended')).toBeNull();
  });
});
