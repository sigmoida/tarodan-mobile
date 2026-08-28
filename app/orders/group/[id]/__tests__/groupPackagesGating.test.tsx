/**
 * B10 — paket kırılımı kapısı: `packages.length > 1` (kablo testi).
 *
 * `groupPackages.test.tsx` `GroupPackageCard`'ın kendi render mantığını
 * kilitliyor; bu dosya ekranın onu NE ZAMAN monte ettiğini kilitliyor — tek
 * paketli grupta kart hiç görünmemeli (§5 DRY: üstteki sipariş satırı zaten
 * aynı bilgiyi taşıyor), çok paketli grupta her paket için bir kart görünmeli.
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
  ordersApi: {
    getGroup: jest.fn(),
    cancelGroup: jest.fn(),
  },
}));
import { ordersApi } from '@/lib/api';

import OrderGroupDetailScreen from '../index';

const getGroupMock = ordersApi.getGroup as jest.Mock;

const order = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  orderNumber: `ORD-${id}`,
  status: 'delivered',
  totalAmount: 200,
  product: { id: `p-${id}`, title: `Ürün ${id}` },
  seller: { id: `s-${id}`, displayName: `Satıcı ${id}` },
  ...overrides,
});

const groupFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'group-1',
  groupNumber: 'GRP-1',
  totalAmount: 400,
  status: 'delivered',
  createdAt: new Date('2026-01-01').toISOString(),
  payment: { status: 'completed', amount: 400 },
  orders: [order('o1')],
  packages: [
    {
      id: 'pkg1',
      packageNumber: 'PKG-AAA',
      sellerId: 's-o1',
      seller: { id: 's-o1', publicName: 'Satıcı Bir', displayName: 'Satıcı Bir' },
      shippingCost: 25,
      cargo: null,
    },
  ],
  ...overrides,
});

describe('paket kırılımı kapısı', () => {
  beforeEach(() => getGroupMock.mockReset());

  it('tek paketli grupta paket kartı GÖRÜNMEZ', async () => {
    getGroupMock.mockResolvedValue({ data: { data: groupFixture() } });
    renderWithProviders(<OrderGroupDetailScreen />);
    await waitFor(() => expect(screen.getByText('GRP-1')).toBeOnTheScreen());
    expect(screen.queryByTestId('group-package-card')).toBeNull();
  });

  it('çok paketli grupta HER paket için bir kart görünür', async () => {
    getGroupMock.mockResolvedValue({
      data: {
        data: groupFixture({
          orders: [order('o1'), order('o2')],
          packages: [
            {
              id: 'pkg1',
              packageNumber: 'PKG-AAA',
              sellerId: 's-o1',
              seller: { id: 's-o1', publicName: 'Satıcı Bir', displayName: 'Satıcı Bir' },
              shippingCost: 25,
              cargo: null,
            },
            {
              id: 'pkg2',
              packageNumber: 'PKG-BBB',
              sellerId: 's-o2',
              seller: { id: 's-o2', publicName: 'Satıcı İki', displayName: 'Satıcı İki' },
              shippingCost: 40,
              cargo: null,
            },
          ],
        }),
      },
    });
    renderWithProviders(<OrderGroupDetailScreen />);
    await waitFor(() => expect(screen.getAllByTestId('group-package-card')).toHaveLength(2));
    expect(screen.getByText('PKG-AAA')).toBeOnTheScreen();
    expect(screen.getByText('PKG-BBB')).toBeOnTheScreen();
  });
});
