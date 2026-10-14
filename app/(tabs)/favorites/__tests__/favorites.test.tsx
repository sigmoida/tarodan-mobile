/**
 * J57 · favori listesi ekranı (yığın ekranı, PageShell): misafir CTA, boş durum, dolu liste render.
 * J21 · favoriden çıkar butonu (handleRemove → removeFromFavorites çağrısı).
 * Sadece MOBİL-UI: render/durum gösterimi + navigasyon wiring.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));


const mockState = {
  isAuthenticated: true,
  items: [] as any[],
  fetchFavorites: jest.fn(),
  removeFromFavorites: jest.fn().mockResolvedValue(true),
  addItem: jest.fn(),
  removeByProductId: jest.fn(),
  updateQuantity: jest.fn(),
  isInCart: jest.fn().mockReturnValue(false),
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: mockState.isAuthenticated });
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    items: mockState.items,
    isLoading: false,
    error: null,
    fetchFavorites: mockState.fetchFavorites,
    removeFromFavorites: mockState.removeFromFavorites,
    getFavoriteCount: () => mockState.items.length,
  }),
}));

jest.mock('@/stores/cartStore', () => {
  const useCartStore: any = () => ({
    // `useCartSync.add` reddedilen eklemeyi geri alabilmek için ÖNCEKİ satırı
    // okur; sahte store da o alanı taşımalı.
    items: mockState.items,
    addItem: mockState.addItem,
    removeByProductId: mockState.removeByProductId,
    updateQuantity: mockState.updateQuantity,
    isInCart: mockState.isInCart,
  });
  // `useCartSync.add` eklenen farkı `getState()` ile okur.
  useCartStore.getState = () => ({ items: mockState.items });
  return { useCartStore };
});

import FavoritesScreen from '../index';

const makeItem = (productId: string, title = 'Hot Wheels') => ({
  id: `id-${productId}`,
  productId,
  product: {
    id: productId,
    title,
    price: 250,
    images: [],
    condition: 'good',
    status: 'active',
    seller: { id: 's1', displayName: 'Satıcı X' },
  },
  addedAt: new Date().toISOString(),
});

beforeEach(() => {
  resetRouterMocks();
  mockState.fetchFavorites.mockClear();
  mockState.removeFromFavorites.mockClear();
  mockState.addItem.mockClear();
  mockState.removeByProductId.mockClear();
  mockState.isInCart.mockClear().mockReturnValue(false);
  mockState.isAuthenticated = true;
  mockState.items = [];
});

describe('J57 · favoriler ekranı — misafir', () => {
  it('giriş yapılmamışsa giriş CTA gösterir ve butona basınca login push', () => {
    mockState.isAuthenticated = false;
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('Favorileri görüntülemek için giriş yapın')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('J57 · favoriler ekranı — boş durum', () => {
  it('liste boşken boş durum metni ve keşfet butonu görünür', () => {
    mockState.items = [];
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('Henüz favoriniz yok')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Ürünleri Keşfet'));
    expect(pushMock).toHaveBeenCalledWith('/search');
  });
});

describe('J57 · favoriler ekranı — dolu liste', () => {
  it('ürün başlığı/satıcı/sayaç başlık render edilir', () => {
    mockState.items = [makeItem('p1', 'Mustang 1967'), makeItem('p2', 'Camaro')];
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getByText('Mustang 1967')).toBeOnTheScreen();
    expect(screen.getByText('Camaro')).toBeOnTheScreen();
    expect(screen.getByText('Favorilerim (2)')).toBeOnTheScreen();
  });

  it('J21 · favoriden çıkar butonu removeFromFavorites çağırır', () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Favorilerden Çıkar'));
    expect(mockState.removeFromFavorites).toHaveBeenCalledWith('p1');
  });

  it('sepet butonu toggle: sepette değilse addItem, sepetteyse removeByProductId çağırır', () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Sepete Ekle'));
    expect(mockState.addItem).toHaveBeenCalledWith(expect.objectContaining({ productId: 'p1' }));

    mockState.isInCart.mockReturnValue(true);
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Sepetten Çıkar'));
    expect(mockState.removeByProductId).toHaveBeenCalledWith('p1');
  });

  it('ürün kartına dokununca ürün detayına push eder', () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByText('Hot Wheels'));
    expect(pushMock).toHaveBeenCalledWith('/product/p1');
  });
});

describe('geri bildirim — eylemsiz toast (eski Snackbar her mesajda sepet eylemi gösteriyordu)', () => {
  beforeEach(() => {
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
  });

  it('kaldırma başarılı -> toast.success', async () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Favorilerden Çıkar'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Favorilerden çıkarıldı'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('kaldırma başarısız -> toast.error (başarı mesajı DEĞİL)', async () => {
    mockState.removeFromFavorites.mockResolvedValueOnce(false);
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Favorilerden Çıkar'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('sepete ekle -> toast.success', () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByLabelText('Sepete Ekle'));
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});
