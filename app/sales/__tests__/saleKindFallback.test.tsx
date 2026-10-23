/**
 * Sentry traceability of the sale detail query (tarodan-ops `contracts/deltas/2026-10-23-order-kind.md`,
 * `docs/observability.md`). The order and group queries are pinned in `orderKindContract.test.tsx`;
 * this pins the third caller, `useSaleDetail`: a body without `kind` (an API older than the delta)
 * leaves one `order.digital.fallback` breadcrumb with ids only, a body with `kind` leaves none.
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
}));
jest.mock('@/services/sentry', () => ({
  ...jest.requireActual('@/services/sentry'),
  addBreadcrumb: jest.fn(),
}));

import { ordersApi } from '@/lib/api';
import { addBreadcrumb } from '@/services/sentry';
import SaleDetailScreen from '../[id]';

const getOneMock = ordersApi.getOne as jest.Mock;
const breadcrumb = addBreadcrumb as jest.Mock;

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
  buyer: { id: 'buyer-1', displayName: 'Ayşe' },
  items: [{ id: 'i1', price: 320, quantity: 1, product: { id: 'p1', title: 'Deri Ceket' } }],
  ...signals,
});

async function renderSale(signals: Record<string, unknown>) {
  getOneMock.mockResolvedValue({ data: { data: sale(signals) } });
  renderWithProviders(<SaleDetailScreen />);
  await waitFor(() => expect(screen.getByText('Sipariş #ORD-2001000000')).toBeOnTheScreen());
}

const fallbackCalls = () =>
  breadcrumb.mock.calls.filter(([b]) => b?.message === 'order.digital.fallback');

beforeEach(() => {
  getOneMock.mockReset();
  breadcrumb.mockReset();
});

it.each([
  ['listing', { kind: 'listing', origin: 'direct_sale', isMembership: false }],
  ['boost', { kind: 'boost', origin: 'platform_service', isMembership: true }],
])('a body with kind (%s) leaves no fallback breadcrumb', async (_label, signals) => {
  await renderSale(signals);
  expect(fallbackCalls()).toHaveLength(0);
});

it.each([
  ['listing from the live API', { origin: 'direct_sale', isMembership: false }, false],
  ['boost from the live API (origin only)', { origin: 'platform_service', isMembership: false }, true],
  ['membership with isMembership only', { isMembership: true }, true],
])('a body without kind leaves one breadcrumb: %s', async (_label, signals, digital) => {
  await renderSale(signals);
  expect(fallbackCalls()).toEqual([
    [
      {
        category: 'order',
        message: 'order.digital.fallback',
        level: 'info',
        data: { orderId: 'sale-1', digital },
      },
    ],
  ]);
});
