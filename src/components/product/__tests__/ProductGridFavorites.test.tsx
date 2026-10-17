/**
 * ProductGrid ↔ favori kalbi: liste favorites cache'inden durum alır, kendi ilanında kalp yok,
 * kalbe basmak ekler/çıkarır ve ürünü açmaz.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';
import { ProductGrid } from '../ProductGrid';
import { resetFavoriteToggleStateForTests } from '@/hooks/useFavoriteToggle';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  wishlistApi: { get: jest.fn(), add: jest.fn(), remove: jest.fn(), clear: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { isAuthenticated: boolean; user: { id: string } }) => unknown) => {
    const state = { isAuthenticated: true, user: { id: 'me' } };
    return sel ? sel(state) : state;
  },
}));

import { wishlistApi } from '@/lib/api';

const wishlist = wishlistApi as unknown as { get: jest.Mock; add: jest.Mock; remove: jest.Mock };

const items = [
  { id: 'a', title: 'Ürün A', price: 10, images: [], sellerId: 'other' },
  { id: 'b', title: 'Ürün B', price: 20, images: [], sellerId: 'other' },
  { id: 'mine', title: 'Benim ürünüm', price: 30, images: [], seller: { id: 'me' } },
];

/** Kalbin seçili (favoride) durumu. */
const selected = (id: string) => screen.getByTestId(`product-card-favorite-${id}`).props.accessibilityState?.selected;

beforeEach(() => {
  resetFavoriteToggleStateForTests();
  jest.clearAllMocks();
  jest.spyOn(toast, 'success').mockImplementation(() => 1);
  jest.spyOn(toast, 'error').mockImplementation(() => 1);
  wishlist.get.mockResolvedValue({ data: { items: [{ id: 'w1', productId: 'b' }] } });
  wishlist.add.mockResolvedValue({ data: {} });
  wishlist.remove.mockResolvedValue({ data: {} });
});

describe('ProductGrid · favori kalbi', () => {
  it('durum cache\'ten: favorideki dolu, diğeri boş; kendi ilanında kalp yok', async () => {
    renderWithProviders(<ProductGrid items={items} />);
    await waitFor(() => expect(selected('b')).toBe(true));
    expect(selected('a')).toBe(false);
    expect(screen.queryByTestId('product-card-favorite-mine')).toBeNull();
  });

  it('kalbe basmak ekler (kalp dolar), ürünü açmaz', async () => {
    renderWithProviders(<ProductGrid items={items} />);
    await waitFor(() => expect(selected('b')).toBe(true));
    // Sunucu eklemeden sonra listeyi yeni ürünle döndürür (ekleme sonrası senkron refetch).
    wishlist.get.mockResolvedValue({ data: { items: [{ id: 'w1', productId: 'b' }, { id: 'w2', productId: 'a' }] } });
    fireEvent.press(screen.getByTestId('product-card-favorite-a'));
    await waitFor(() => expect(wishlist.add).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(selected('a')).toBe(true));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('favorideki ürünün kalbine basmak çıkarır', async () => {
    renderWithProviders(<ProductGrid items={items} />);
    await waitFor(() => expect(selected('b')).toBe(true));
    fireEvent.press(screen.getByTestId('product-card-favorite-b'));
    await waitFor(() => expect(wishlist.remove).toHaveBeenCalledWith('b'));
  });
});
