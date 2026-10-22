/**
 * Even with digital sales switched on (`CAN_BUY_DIGITAL`, the IAP case of ADR 0003 / 0015), the
 * card has no boost purchase surface: `productCardAction` returns `boost` for the seller's own
 * active listing, and the mobile card renders nothing for it (no "Öne Çıkar", no "Süre Ekle").
 * Pair of the iOS / store suite `app/__tests__/ios-no-digital-sales.test.tsx`.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { productCardAction } from '@/types';
import { ProductCard } from '../ProductCard';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('@/lib/api', () => ({ productsApi: { recordClick: jest.fn(() => Promise.resolve({})) } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/stores/authStore', () => {
  const state = { isAuthenticated: true, user: { id: 'seller-1' } };
  return { useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(state) : state) };
});

const own = {
  id: 'p1',
  title: 'Hot Wheels Supra',
  price: 250,
  images: [],
  status: 'active',
  availableQuantity: 1,
  sellerId: 'seller-1',
};

describe('buy enabled: own listing card', () => {
  it('the shared rule offers a boost here (the input mobile passes is CAN_BUY_DIGITAL)', () => {
    expect(productCardAction({ ...own, isBoosted: true }, { userId: 'seller-1', canBoost: true })).toEqual({
      kind: 'boost',
      extend: true,
    });
  });

  it.each([false, true])('isBoosted=%s: the card still renders no button and no boost copy', (isBoosted) => {
    renderWithProviders(<ProductCard product={{ ...own, isBoosted }} />);
    expect(screen.queryByTestId('product-card-cart-p1')).toBeNull();
    expect(screen.queryByTestId('product-card-action-spacer')).toBeNull();
    expect(screen.queryByText('Öne Çıkar')).toBeNull();
    expect(screen.queryByText('Süre Ekle')).toBeNull();
  });
});
