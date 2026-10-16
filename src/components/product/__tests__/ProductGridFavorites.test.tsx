/**
 * ProductGrid ↔ favori kalbi: liste favorites cache'inden durum alır, kendi ilanında kalp yok,
 * kalbe basmak ekler/çıkarır ve ürünü açmaz.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';
import { ProductGrid } from '../ProductGrid';

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

beforeEach(() => {
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
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-b').props.accessibilityLabel).toBe('Favorilerden Çıkar'));
    expect(screen.getByTestId('product-card-favorite-a').props.accessibilityLabel).toBe('Favorilere Ekle');
    expect(screen.queryByTestId('product-card-favorite-mine')).toBeNull();
  });

  it('kalbe basmak ekler (kalp dolar), ürünü açmaz', async () => {
    renderWithProviders(<ProductGrid items={items} />);
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-b').props.accessibilityLabel).toBe('Favorilerden Çıkar'));
    // Sunucu eklemeden sonra listeyi yeni ürünle döndürür (ekleme sonrası senkron refetch).
    wishlist.get.mockResolvedValue({ data: { items: [{ id: 'w1', productId: 'b' }, { id: 'w2', productId: 'a' }] } });
    fireEvent.press(screen.getByTestId('product-card-favorite-a'));
    await waitFor(() => expect(wishlist.add).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-a').props.accessibilityLabel).toBe('Favorilerden Çıkar'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('favorideki ürünün kalbine basmak çıkarır', async () => {
    renderWithProviders(<ProductGrid items={items} layout="list" />);
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-b').props.accessibilityLabel).toBe('Favorilerden Çıkar'));
    fireEvent.press(screen.getByTestId('product-card-favorite-b'));
    await waitFor(() => expect(wishlist.remove).toHaveBeenCalledWith('b'));
  });
});
