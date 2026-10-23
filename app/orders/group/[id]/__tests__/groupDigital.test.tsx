/**
 * Digital orders in the order group screen (tarodan-ops `contracts/deltas/2026-10-23-order-kind.md`).
 *
 * Group views carry their own top-level `kind` ("group" | "package" | "synthetic"); the gate reads
 * the per-order signals inside `orders[]`. A digital line shows no tracking line and no cancel or
 * refund action, and a group holding one offers no group cancel. A listing line in the same state
 * keeps them.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'group-1' }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  ordersApi: { getGroup: jest.fn(), cancelGroup: jest.fn() },
}));
import { ordersApi } from '@/lib/api';
import OrderGroupDetailScreen from '../index';

const getGroupMock = ordersApi.getGroup as jest.Mock;

const LISTING = { kind: 'listing', origin: 'direct_sale', isMembership: false };
const DIGITAL: Array<[string, Record<string, unknown>]> = [
  ['boost (kind)', { kind: 'boost', origin: 'platform_service', isMembership: true }],
  ['membership (kind)', { kind: 'membership', origin: 'platform_service', isMembership: true }],
  ['no kind, origin platform_service', { origin: 'platform_service', isMembership: false }],
  ['no kind or origin, isMembership only', { isMembership: true }],
];

const group = (status: string, signals: Record<string, unknown>) => ({
  id: 'group-1',
  kind: 'synthetic',
  groupNumber: 'GRP-1',
  totalAmount: 200,
  status,
  createdAt: new Date('2026-01-01').toISOString(),
  payment: { status: 'completed', amount: 200 },
  orders: [
    {
      id: 'o1',
      orderNumber: 'ORD-o1',
      status,
      totalAmount: 200,
      cargoCode: '79174212154116',
      product: { id: 'p1', title: 'Ürün' },
      seller: { id: 's1', displayName: 'Satıcı' },
      ...signals,
    },
  ],
  packages: [],
});

async function renderGroup(status: string, signals: Record<string, unknown>) {
  getGroupMock.mockResolvedValue({ data: { data: group(status, signals) } });
  renderWithProviders(<OrderGroupDetailScreen />);
  await waitFor(() => expect(screen.getByText('GRP-1')).toBeOnTheScreen());
}

const GATES: Array<[string, string, () => unknown]> = [
  ['tracking line', 'shipped', () => screen.queryByTestId('group-tracking-text')],
  ['cancel action of the line', 'paid', () => screen.queryByText('İptal işlemleri')],
  ['refund action of the line', 'delivered', () => screen.queryByText('İade işlemleri')],
  ['group cancel', 'paid', () => screen.queryByTestId('group-cancel-button')],
];

beforeEach(() => getGroupMock.mockReset());

describe.each(GATES)('%s', (_gate, status, find) => {
  it('shows for a listing line', async () => {
    await renderGroup(status, LISTING);
    expect(find()).not.toBeNull();
  });

  it.each(DIGITAL)('is hidden for a digital line: %s', async (_label, signals) => {
    await renderGroup(status, signals);
    expect(find()).toBeNull();
  });
});
