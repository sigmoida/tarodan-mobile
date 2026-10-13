/**
 * Parite A-3.1 / A-3.4 · Sipariş detayı ekranında süreler ve e-Arşiv belgeleri.
 *
 * - İade butonu sunucunun `returnWindowEndsAt` damgasına bağlı (sabit 14 gün
 *   15. günde gizliyordu, sunucu kabul ederken).
 * - Gün/saat sayıları `GET /timing-rules`'tan gelir (metinde sabit 14/24 yok).
 * - Satıcı ödeme tarihi sunucunun `escrowReleaseAt`'i.
 * - Hazırlık son tarihi ve tek seferlik uzatma notu (web `PreparingDeadlineNotice`).
 * - e-Arşiv: taraf başına üç belge listelenir, her biri ayrı açılır.
 */
import React from 'react';
import { Linking } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
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
  elogoInvoicesApi: { byOrderAll: jest.fn(), pdf: jest.fn() },
  sellerInvoiceApi: { status: jest.fn(() => Promise.resolve({ data: null })), download: jest.fn() },
}));
import { api, elogoInvoicesApi, timingRulesApi } from '@/lib/api';
import OrderDetailScreen from '../[id]';

const DAY_MS = 86_400_000;
const getMock = api.get as jest.Mock;
const policyMock = timingRulesApi.getPolicy as jest.Mock;
const invoicesMock = elogoInvoicesApi.byOrderAll as jest.Mock;
const pdfMock = elogoInvoicesApi.pdf as jest.Mock;

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
  invoicesMock.mockReset();
  invoicesMock.mockResolvedValue({ data: [] });
  pdfMock.mockReset();
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

  it('damga geçmişse buton yok; gün sayısı SİPARİŞİN damgasından (admin sonradan 30 yapsa da 14)', async () => {
    policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 30, unit: 'days' } } });
    serveOrder({
      deliveredAt: new Date(Date.now() - 15 * DAY_MS).toISOString(),
      returnWindowEndsAt: new Date(Date.now() - DAY_MS).toISOString(), // teslim + 14
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText('14 günlük iade süresi doldu; bu sipariş için artık iade talebi oluşturulamaz.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('refund-request-button')).toBeNull();
  });

  it('30 günle damgalanmış siparişte açık pencere metni 30 der (politika 14 olsa da)', async () => {
    serveOrder({
      deliveredAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
      returnWindowEndsAt: new Date(Date.now() + 10 * DAY_MS).toISOString(), // teslim + 30
    });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText('Teslimattan sonra 30 gün içinde sebep belirtmeden iade talep edebilirsiniz.'),
    ).toBeOnTheScreen();
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
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  it('escrow kartı iade penceresi sonunu ve ödeme tarihini AYRI gösterir (tarih ile metin çelişmez)', async () => {
    const windowEnd = '2026-02-04T09:00:00.000Z';
    const release = '2026-02-05T09:00:00.000Z';
    serveOrder({ deliveredAt: '2026-01-21T09:00:00.000Z', returnWindowEndsAt: windowEnd, escrowReleaseAt: release });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText(
        `${fmt(windowEnd)} tarihine kadar iade talep edebilirsiniz. Açık bir iade talebi yoksa satıcıya ödeme ${fmt(release)} tarihinde serbest bırakılır.`,
      ),
    ).toBeOnTheScreen();
  });

  it('damga yoksa iki tarih de politikadan: pencere sonu = teslim + 21, ödeme = + grace', async () => {
    policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 21, unit: 'days' } } });
    serveOrder({ deliveredAt: '2026-01-10T09:00:00.000Z' });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText(
        `${fmt('2026-01-31T09:00:00.000Z')} tarihine kadar iade talep edebilirsiniz. Açık bir iade talebi yoksa satıcıya ödeme ${fmt('2026-02-01T09:00:00.000Z')} tarihinde serbest bırakılır.`,
      ),
    ).toBeOnTheScreen();
  });
});

describe('A-3 inceleme #1 · tarihsiz escrow metni', () => {
  it('teslim tarihi yoksa: pencere günü ve grace günü ayrı söylenir', async () => {
    serveOrder({ deliveredAt: null });
    renderWithProviders(<OrderDetailScreen />);
    expect(
      await screen.findByText(
        'Teslimden sonra 14 gün içinde iade talep edebilirsiniz. Açık bir iade talebi yoksa satıcıya ödeme bu süre dolduktan 1 gün sonra serbest bırakılır.',
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

describe('A-3.4 · e-Arşiv belgeleri listelenir', () => {
  const INVOICES = [
    { id: 'inv-1', invoiceNumber: 'TRD2026000000001', label: 'Platform hizmet bedeli' },
    { id: 'inv-2', invoiceNumber: 'TRD2026000000002', label: 'Kargo payı' },
    { id: 'inv-3', invoiceNumber: null, label: 'Komisyon' },
  ];

  it('üç belge ayrı satırda, numarası olanlar "No:" ile', async () => {
    invoicesMock.mockResolvedValue({ data: INVOICES });
    serveOrder();
    renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByText('Platform hizmet bedeli')).toBeOnTheScreen();
    expect(screen.getByText('Kargo payı')).toBeOnTheScreen();
    expect(screen.getByText('Komisyon')).toBeOnTheScreen();
    expect(screen.getByText('No: TRD2026000000001')).toBeOnTheScreen();
    expect(screen.getByText('No: TRD2026000000002')).toBeOnTheScreen();
    expect(invoicesMock).toHaveBeenCalledWith('order-1');
  });

  it('dokunulan belge kendi PDF adresiyle açılır', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    invoicesMock.mockResolvedValue({ data: INVOICES });
    pdfMock.mockResolvedValue({ data: { url: 'https://s3/inv-2.pdf' } });
    serveOrder();
    renderWithProviders(<OrderDetailScreen />);
    fireEvent.press(await screen.findByTestId('order-invoice-open-inv-2'));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://s3/inv-2.pdf'));
    expect(pdfMock).toHaveBeenCalledWith('inv-2');
    openURL.mockRestore();
  });

  it('PDF hazır değilse snackbar "Fatura henüz hazır değil"', async () => {
    invoicesMock.mockResolvedValue({ data: INVOICES });
    pdfMock.mockResolvedValue({ data: {} });
    serveOrder();
    renderWithProviders(<OrderDetailScreen />);
    fireEvent.press(await screen.findByTestId('order-invoice-open-inv-1'));
    expect(await screen.findByText('Fatura henüz hazır değil')).toBeOnTheScreen();
  });

  it('iade edilmiş siparişte de belgeler görünür; ödeme bekleyende istek atılmaz (web kuralı)', async () => {
    invoicesMock.mockResolvedValue({ data: INVOICES });
    serveOrder({ status: 'refunded' });
    const first = renderWithProviders(<OrderDetailScreen />);
    expect(await screen.findByText('Platform hizmet bedeli')).toBeOnTheScreen();
    first.unmount();

    invoicesMock.mockClear();
    serveOrder({ status: 'pending_payment', payment: { status: 'pending' } });
    renderWithProviders(<OrderDetailScreen />);
    await screen.findByText('Sipariş #ORD-1001000000');
    expect(invoicesMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('order-invoice-card')).toBeNull();
  });
});
