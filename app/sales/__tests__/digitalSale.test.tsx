/**
 * Digital sale detail gating (tarodan-ops `contracts/deltas/2026-10-23-order-kind.md`).
 *
 * The seller of a membership or boost order is the platform account, so a regular seller never
 * opens one; the gate is defensive. A digital sale shows no shipping address, shipment card,
 * shipping line or preparing note, and its item is static (its virtual product has no listing
 * page). A listing sale in the same state keeps all of them.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'sale-1' }),
}));

jest.mock('@/lib/api', () => ({
  ordersApi: { getOne: jest.fn(), cancel: jest.fn() },
}));
import { router } from 'expo-router';
import { ordersApi } from '@/lib/api';
import SaleDetailScreen from '../[id]';

const getOneMock = ordersApi.getOne as jest.Mock;

const sale = (signals: Record<string, unknown>) => ({
  id: 'sale-1',
  orderNumber: 'ORD-2001000000',
  status: 'paid',
  totalAmount: 350,
  subtotal: 320,
  shippingCost: 30,
  createdAt: new Date('2026-01-01').toISOString(),
  isSeller: true,
  isBuyer: false,
  preparingDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
  buyer: { id: 'buyer-1', displayName: 'Ayşe' },
  shippingAddress: {
    fullName: 'Ayşe Yılmaz', phone: '0500', address: 'Sokak 1', city: 'İstanbul', district: 'Kadıköy',
  },
  items: [{ id: 'i1', price: 320, quantity: 1, product: { id: 'p1', title: 'Deri Ceket' } }],
  ...signals,
});

const LISTING = { kind: 'listing', origin: 'direct_sale', isMembership: false };
const DIGITAL: Array<[string, Record<string, unknown>]> = [
  ['boost (kind)', { kind: 'boost', origin: 'platform_service', isMembership: true }],
  ['membership (kind)', { kind: 'membership', origin: 'platform_service', isMembership: true }],
  ['no kind, origin platform_service', { origin: 'platform_service', isMembership: false }],
  ['no kind or origin, isMembership only', { isMembership: true }],
];

async function renderSale(signals: Record<string, unknown>) {
  getOneMock.mockResolvedValue({ data: { data: sale(signals) } });
  renderWithProviders(<SaleDetailScreen />);
  await waitFor(() => expect(screen.getByText('Sipariş #ORD-2001000000')).toBeOnTheScreen());
}

const GATES: Array<[string, () => unknown]> = [
  ['shipping address', () => screen.queryByText('Ayşe Yılmaz')],
  ['shipment card', () => screen.queryByTestId('sales-shipment-card')],
  ['shipping line', () => screen.queryByText('Kargo')],
  ['preparing deadline notice', () => screen.queryByTestId('preparing-deadline-notice')],
  ['item link', () => screen.queryByTestId('sales-item-link')],
];

beforeEach(() => {
  getOneMock.mockReset();
  (router.push as jest.Mock).mockClear();
});

describe.each(GATES)('%s', (_gate, find) => {
  it('shows on a listing sale', async () => {
    await renderSale(LISTING);
    expect(find()).not.toBeNull();
  });

  it.each(DIGITAL)('is hidden on a digital sale: %s', async (_label, signals) => {
    await renderSale(signals);
    expect(find()).toBeNull();
  });
});

it.each(DIGITAL)('a digital sale keeps its item as static content and its amounts: %s', async (_label, signals) => {
  await renderSale(signals);
  expect(screen.getByTestId('sales-item-static')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Deri Ceket'));
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('Ara Toplam')).toBeOnTheScreen();
});

it('a listing sale item opens the listing', async () => {
  await renderSale(LISTING);
  fireEvent.press(screen.getByText('Deri Ceket'));
  expect(router.push).toHaveBeenCalledWith('/product/p1');
});
