/**
 * Digital order detail gating (tarodan-ops `contracts/deltas/2026-10-23-order-kind.md`).
 *
 * A membership or boost order sells a platform service, not goods. On the buyer's order detail
 * it shows no shipping address, shipping row, tracking, escrow, cancel, refund request, rating,
 * preparing note, shipped or delivered step, condition row and no pay button (ADR 0003), and its
 * product and seller cards are static (D4). Every gate is pinned for each way the API can tell a
 * digital order apart (`kind`; or, from an API without `kind`, `origin`, then `isMembership`),
 * against a listing order in the same state that still shows the element.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { makeTestQueryClient, renderWithProviders } from '@/test-utils';
import { qk } from '@/lib/query';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'order-1' }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  shippingApi: { getOrderShipments: jest.fn(() => Promise.resolve({ data: null })) },
  ordersApi: { cancel: jest.fn(), confirm: jest.fn(), confirmReceipt: jest.fn() },
  refundsApi: { create: jest.fn(), cancel: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
  paymentsApi: { initiate: jest.fn(), bypassComplete: jest.fn() },
  elogoInvoicesApi: { byOrderAll: jest.fn(() => Promise.resolve({ data: [] })), pdf: jest.fn() },
  sellerInvoiceApi: { status: jest.fn(() => Promise.resolve({ data: null })), download: jest.fn() },
}));
import { router } from 'expo-router';
import { api, elogoInvoicesApi, sellerInvoiceApi, shippingApi } from '@/lib/api';
import OrderDetailScreen from '../[id]';

const getMock = api.get as jest.Mock;

const DAY = 24 * 3600 * 1000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

/** A listing order of goods (`GET /orders/:id` after the delta). */
const listing = {
  kind: 'listing',
  origin: 'direct_sale',
  isMembership: false,
  orderNumber: 'ORD-1001000000',
  product: { id: 'p1', title: 'Deri Ceket', price: 320, condition: 'used', images: [] },
  seller: { id: 'seller-1', displayName: 'Mehmet' },
};

/** The ways an order response can mark a digital order (the fallbacks are for an API without `kind`). */
const DIGITAL: Array<[string, Record<string, unknown>]> = [
  [
    'boost (kind)',
    {
      kind: 'boost',
      origin: 'platform_service',
      isMembership: true,
      orderNumber: 'BST-1781257318265-AB12CD34',
      product: { id: 'boost-b1', title: 'Öne çıkarma', price: 59.9, condition: 'new', images: [] },
      seller: { id: 'platform-1', displayName: 'Tarodan' },
    },
  ],
  [
    'membership (kind)',
    {
      kind: 'membership',
      origin: 'platform_service',
      isMembership: true,
      orderNumber: 'MEM-1781257318265-BENIPST9F',
      product: { id: 'membership-t1', title: 'Premium üyelik', price: 199, condition: 'new', images: [] },
      seller: { id: 'platform-1', displayName: 'Tarodan' },
    },
  ],
  [
    'boost from an API without kind (origin only, isMembership false)',
    {
      origin: 'platform_service',
      isMembership: false,
      orderNumber: 'BST-1781257318265-AB12CD34',
      product: { id: 'boost-b1', title: 'Öne çıkarma', price: 59.9, condition: 'new', images: [] },
      seller: { id: 'platform-1', displayName: 'Tarodan' },
    },
  ],
  [
    'membership from an API without kind or origin (isMembership only)',
    {
      isMembership: true,
      orderNumber: 'MEM-1781257318265-BENIPST9F',
      product: { id: 'membership-t1', title: 'Premium üyelik', price: 199, condition: 'new', images: [] },
      seller: { id: 'platform-1', displayName: 'Tarodan' },
    },
  ],
];

/**
 * One order body. The shipping fields are filled on purpose, digital or not: the gate must hide
 * them because the order is digital, not because the data happens to be empty.
 */
function body(signals: Record<string, unknown>, state: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'order-1',
    status: 'completed',
    totalAmount: 350,
    shippingCost: 30,
    shippingAddress: { fullName: 'Ayşe', phone: '0500', address: 'Sokak 1', city: 'İstanbul' },
    shipment: { cargoCode: '79174212154116', status: 'delivered' },
    createdAt: iso(-10 * DAY),
    paidAt: iso(-10 * DAY),
    shippedAt: iso(-8 * DAY),
    deliveredAt: iso(-2 * DAY),
    isBuyer: true,
    isSeller: false,
    payment: { status: 'completed' },
    activeRefundRequest: null,
    hasProductRating: false,
    hasSellerRating: false,
    ...signals,
    ...state,
  };
}

async function renderOrder(signals: Record<string, unknown>, state: Record<string, unknown> = {}) {
  const order = body(signals, state);
  getMock.mockResolvedValue({ data: { data: order } });
  renderWithProviders(<OrderDetailScreen />);
  await waitFor(() => expect(screen.getByText(`Sipariş #${String(order.orderNumber)}`)).toBeOnTheScreen());
}

/** Each gated element: the order state that shows it on a listing order, and how to find it. */
const GATES: Array<[string, Record<string, unknown>, () => unknown]> = [
  ['shipping address card', {}, () => screen.queryByText('Teslimat Adresi')],
  ['shipping row of the payment summary', {}, () => screen.queryByText('Kargo')],
  ['tracking card', { status: 'shipped', deliveredAt: null }, () => screen.queryByTestId('order-tracking-card')],
  ['shipped timeline step', {}, () => screen.queryByTestId('order-shipped-timeline')],
  ['delivered timeline step', {}, () => screen.queryByTestId('order-delivered-timeline')],
  ['escrow card', { status: 'delivered' }, () => screen.queryByTestId('order-escrow-info')],
  [
    'cancel card',
    { status: 'paid', shippedAt: null, deliveredAt: null, shipment: null },
    () => screen.queryByTestId('order-cancel-button'),
  ],
  [
    'preparing deadline notice',
    { status: 'paid', shippedAt: null, deliveredAt: null, shipment: null, preparingDeadline: iso(3 * DAY) },
    () => screen.queryByTestId('preparing-deadline-notice'),
  ],
  ['refund request', {}, () => screen.queryByTestId('refund-request-button')],
  ['rating section', {}, () => screen.queryByText('Değerlendirme')],
  [
    'pay button (no digital purchase in the app, ADR 0003)',
    { status: 'pending_payment', paidAt: null, shippedAt: null, deliveredAt: null, shipment: null, payment: null },
    () => screen.queryByTestId('order-pay-button'),
  ],
  ['product condition row', {}, () => screen.queryByText(/^Durum:/)],
  ['product link', {}, () => screen.queryByTestId('order-product-link')],
  ['seller profile link', {}, () => screen.queryByText('Satıcı Profilini Görüntüle')],
];

beforeEach(() => {
  getMock.mockReset();
  (router.push as jest.Mock).mockClear();
});

describe.each(GATES)('%s', (_gate, state, find) => {
  it('shows on a listing order in the same state', async () => {
    await renderOrder(listing, state);
    expect(find()).not.toBeNull();
  });

  it.each(DIGITAL)('is hidden on a digital order: %s', async (_label, signals) => {
    await renderOrder(signals, state);
    expect(find()).toBeNull();
  });
});

describe.each(DIGITAL)('digital order %s', (_label, signals) => {
  it('keeps the order number, status, paid step, price lines and total', async () => {
    await renderOrder(signals);
    expect(screen.getByTestId('order-paid-timeline')).toBeOnTheScreen();
    expect(screen.getByText('Ödeme Özeti')).toBeOnTheScreen();
    expect(screen.getByText('Ürün Tutarı')).toBeOnTheScreen();
    expect(screen.getByText('Toplam')).toBeOnTheScreen();
  });

  it('shows the product and the seller as static content that navigates nowhere', async () => {
    await renderOrder(signals);
    const product = screen.getByTestId('order-product-static');
    const seller = screen.getByTestId('order-seller-static');
    expect(screen.getByText(String((signals.product as { title: string }).title))).toBeOnTheScreen();
    expect(screen.getByText('Tarodan')).toBeOnTheScreen();
    expect(product.props.accessibilityRole).toBeUndefined();
    expect(seller.props.accessibilityRole).toBeUndefined();
    fireEvent.press(screen.getByText('Tarodan'));
    fireEvent.press(screen.getByText(String((signals.product as { title: string }).title)));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('still shows a cancel or refund step that happened', async () => {
    await renderOrder(signals, { status: 'cancelled', cancelledAt: iso(-1 * DAY) });
    expect(screen.getByTestId('order-refundcancel-timeline')).toBeOnTheScreen();
  });
});

describe('listing order cards', () => {
  it('the product card opens the listing and the seller card opens the profile', async () => {
    await renderOrder(listing);
    fireEvent.press(screen.getByText('Deri Ceket'));
    expect(router.push).toHaveBeenCalledWith('/product/p1');
    fireEvent.press(screen.getByText('Satıcı Profilini Görüntüle'));
    expect(router.push).toHaveBeenCalledWith('/seller/seller-1');
  });
});

describe('invoices', () => {
  const sellerStatus = sellerInvoiceApi.status as jest.Mock;
  const elogoList = elogoInvoicesApi.byOrderAll as jest.Mock;

  beforeEach(() => {
    sellerStatus.mockReset();
    sellerStatus.mockResolvedValue({ data: { invoice: { fileName: 'fatura.pdf' }, canUpload: false, isSeller: false } });
    elogoList.mockResolvedValue({ data: [{ id: 'inv-1', invoiceNumber: 'ELG-1', label: 'Platform hizmet bedeli' }] });
  });

  it('a listing order fetches and shows the seller invoice', async () => {
    await renderOrder(listing);
    expect(await screen.findByTestId('seller-invoice-card')).toBeOnTheScreen();
    expect(sellerStatus).toHaveBeenCalledWith('order-1');
  });

  it.each(DIGITAL)('a digital order never fetches or shows it, and keeps its e-Archive documents: %s', async (_label, signals) => {
    await renderOrder(signals);
    expect(await screen.findByTestId('order-invoice-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('seller-invoice-card')).toBeNull();
    expect(sellerStatus).not.toHaveBeenCalled();
  });
});

describe('shipment query', () => {
  const shipments = shippingApi.getOrderShipments as jest.Mock;
  beforeEach(() => shipments.mockClear());

  /** The order is already cached (e.g. opened from the list), so it is known at the first render. */
  async function renderCached(signals: Record<string, unknown>) {
    const order = body(signals, {});
    getMock.mockResolvedValue({ data: { data: order } });
    const queryClient = makeTestQueryClient();
    queryClient.setQueryData(qk.orders.detail('order-1'), order);
    renderWithProviders(<OrderDetailScreen />, { queryClient });
    await waitFor(() => expect(screen.getByText(`Sipariş #${String(order.orderNumber)}`)).toBeOnTheScreen());
  }

  it('a listing order loads its shipment', async () => {
    await renderCached(listing);
    await waitFor(() => expect(shipments).toHaveBeenCalledWith('order-1'));
  });

  it.each(DIGITAL)('a digital order never asks for one: %s', async (_label, signals) => {
    await renderCached(signals);
    expect(shipments).not.toHaveBeenCalled();
  });
});
