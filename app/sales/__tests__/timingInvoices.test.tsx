/**
 * Parite A-3.1 / A-3.4 · Satış detayı (satıcı tarafı).
 *  - Kargoya verme son tarihi; süre bir kez uzatıldıysa "son süre" uyarısı
 *    (web aynı sipariş sayfasında satıcıya `PreparingDeadlineNotice` gösterir).
 *  - Ödeme zaman aşımı iptal cümlesindeki saat politikadan gelir.
 *  - e-Arşiv belgeleri satıcıya da liste olarak gösterilir.
 */
import React from 'react';
import { Linking, RefreshControl } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert, toast } from '@/ui';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'sale-1' }),
}));

jest.mock('@/lib/api', () => ({
  ordersApi: { getOne: jest.fn(), cancel: jest.fn() },
  timingRulesApi: { getPolicy: jest.fn() },
  elogoInvoicesApi: { byOrderAll: jest.fn(), pdf: jest.fn() },
}));
import { elogoInvoicesApi, ordersApi, timingRulesApi } from '@/lib/api';
import SaleDetailScreen from '../[id]';

const DAY_MS = 86_400_000;
const getOneMock = ordersApi.getOne as jest.Mock;
const policyMock = timingRulesApi.getPolicy as jest.Mock;
const invoicesMock = elogoInvoicesApi.byOrderAll as jest.Mock;
const pdfMock = elogoInvoicesApi.pdf as jest.Mock;

function saleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    orderNumber: 'ORD-2001000000',
    status: 'paid',
    totalAmount: 350,
    createdAt: new Date('2026-01-01').toISOString(),
    buyer: { id: 'buyer-1', displayName: 'Ayşe' },
    isBuyer: false,
    isSeller: true,
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
  invoicesMock.mockReset();
  invoicesMock.mockResolvedValue({ data: [] });
  pdfMock.mockReset();
});

describe('A-3.1 · satıcıya kargoya verme son tarihi', () => {
  it('A-3 inceleme #4 · sunucu taraf bayrağı vermezse (isSeller/isBuyer false) not yok', async () => {
    serve({
      isSeller: false,
      isBuyer: false,
      preparingDeadline: new Date(Date.now() + 2 * DAY_MS).toISOString(),
    });
    renderWithProviders(<SaleDetailScreen />);
    await screen.findByText('Deri Ceket');
    expect(screen.queryByTestId('preparing-deadline-notice')).toBeNull();
  });

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

describe('A-3.4 · satıcıya e-Arşiv belgeleri', () => {
  it('belgeler listelenir ve dokunulan açılır; hata toast.error ile (mesaj BAŞLIK değil)', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    invoicesMock.mockResolvedValue({
      data: [
        { id: 'inv-1', invoiceNumber: 'TRD1', label: 'Komisyon' },
        { id: 'inv-2', invoiceNumber: 'TRD2', label: 'Kargo payı' },
      ],
    });
    pdfMock.mockResolvedValueOnce({ data: { url: 'https://amzn-tarodan.s3.eu-west-1.amazonaws.com/documents/inv-1.pdf' } }).mockRejectedValueOnce(new Error('500'));
    serve({ status: 'delivered' });
    renderWithProviders(<SaleDetailScreen />);

    expect(await screen.findByText('Komisyon')).toBeOnTheScreen();
    expect(screen.getByText('Kargo payı')).toBeOnTheScreen();
    expect(invoicesMock).toHaveBeenCalledWith('sale-1');

    fireEvent.press(screen.getByTestId('order-invoice-open-inv-1'));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://amzn-tarodan.s3.eu-west-1.amazonaws.com/documents/inv-1.pdf'));

    fireEvent.press(screen.getByTestId('order-invoice-open-inv-2'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fatura açılamadı'));
    expect(appAlert).not.toHaveBeenCalled();
    openURL.mockRestore();
  });

  it('ödeme bekleyen ve iptal edilmiş siparişte istek atılmaz', async () => {
    serve({ status: 'pending_payment' });
    const first = renderWithProviders(<SaleDetailScreen />);
    await screen.findByText('Deri Ceket');
    first.unmount();
    serve({ status: 'cancelled' });
    renderWithProviders(<SaleDetailScreen />);
    await screen.findByText('Deri Ceket');
    expect(invoicesMock).not.toHaveBeenCalled();
  });

  it('A-3 inceleme #5 · liste hatası boş sayılmaz; pull-to-refresh listeyi de yeniler', async () => {
    invoicesMock.mockRejectedValueOnce(new Error('500'));
    serve({ status: 'delivered' });
    renderWithProviders(<SaleDetailScreen />);
    expect(await screen.findByTestId('order-invoice-load-failed')).toBeOnTheScreen();

    invoicesMock.mockResolvedValue({ data: [{ id: 'inv-1', invoiceNumber: 'TRD1', label: 'Komisyon' }] });
    await act(async () => {
      await screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(getOneMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Komisyon')).toBeOnTheScreen();
    expect(screen.queryByTestId('order-invoice-load-failed')).toBeNull();
  });
});
