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

// The card's cart button is the shared toggle (`useCartToggle` -> `useCartSync`): a member's write is
// mirrored to the server, so the cart API resolves without a network call.
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  cartApi: {
    addItem: jest.fn(() => Promise.resolve({ data: {} })),
    removeItem: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

const mockState = {
  isAuthenticated: true,
  userId: null as string | null,
  items: [] as any[],
  // The cart store's lines (separate from the favorites list); the card's `inCart` reads them.
  cartItems: [] as any[],
  fetchFavorites: jest.fn(),
  removeFromFavorites: jest.fn().mockResolvedValue(true),
  addItem: jest.fn(),
  removeByProductId: jest.fn(),
  updateQuantity: jest.fn(),
  isInCart: jest.fn().mockReturnValue(false),
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: mockState.isAuthenticated,
      user: mockState.userId == null ? null : { id: mockState.userId },
    };
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
  const cartState = () => ({
    // `useCartSync.add` reads the PREVIOUS line to undo a refused add; the fake store carries it.
    items: mockState.cartItems,
    // `useCartSync.removeByProductId` reads the selection to restore it on a rollback.
    deselectedIds: [],
    addItem: mockState.addItem,
    removeByProductId: mockState.removeByProductId,
    updateQuantity: mockState.updateQuantity,
    isInCart: mockState.isInCart,
  });
  // The selector subscription (`useCartStore((s) => ...)`) and the `useCartSync` actions (`getState()`).
  const useCartStore: any = (sel?: (s: any) => unknown) => (sel ? sel(cartState()) : cartState());
  useCartStore.getState = cartState;
  return { useCartStore };
});

import { useCartWritesStore } from '@/stores/cartWritesStore';
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
  // A toggle press holds the listing's write lock until its mirror settles; never leak it.
  useCartWritesStore.getState().reset();
  mockState.fetchFavorites.mockClear();
  mockState.removeFromFavorites.mockClear();
  mockState.addItem.mockClear();
  mockState.removeByProductId.mockClear();
  mockState.isInCart.mockClear().mockReturnValue(false);
  mockState.isAuthenticated = true;
  mockState.userId = null;
  mockState.items = [];
  mockState.cartItems = [];
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

  it('the shared cart toggle (web parity): adds when not in the cart, removes when it is', () => {
    mockState.items = [makeItem('p1')];
    const first = renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    expect(mockState.addItem).toHaveBeenCalledWith(expect.objectContaining({ productId: 'p1' }));
    first.unmount();

    mockState.isInCart.mockReturnValue(true);
    mockState.cartItems = [{ id: 'c1', productId: 'p1', quantity: 1 }];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    expect(mockState.removeByProductId).toHaveBeenCalledWith('p1');
    expect(pushMock).not.toHaveBeenCalledWith('/cart');
  });

  it('kartta satıcı adı + başlık + fiyat; indirimdeyse eski fiyat üstü çizili', () => {
    const discounted = makeItem('p1', 'Mustang 1967');
    (discounted.product as any).originalPrice = 300;
    mockState.items = [discounted, makeItem('p2', 'Camaro')];
    renderWithProviders(<FavoritesScreen />);
    expect(screen.getAllByText('Satıcı X')).toHaveLength(2);
    expect(screen.getByTestId('favorite-price-p1')).toHaveTextContent('250,00 TL');
    expect(screen.getByTestId('favorite-price-p1-old')).toHaveTextContent('300,00 TL');
    expect(screen.queryByTestId('favorite-price-p2-old')).toBeNull();
  });

  it('builds the cart line like the listing cards (stock cap, numeric price, seller)', () => {
    const item = makeItem('p1');
    (item.product as any).availableQuantity = 2;
    mockState.items = [item];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    expect(mockState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        stock: 2,
        maxQuantityPerOrder: null,
        price: Number(item.product.price),
        seller: expect.objectContaining({ id: 's1' }),
      }),
    );
  });

  it('the cart line carries the per-order cap from the wishlist row', () => {
    const item = makeItem('p1');
    Object.assign(item.product, { availableQuantity: 10, maxQuantityPerOrder: 2 });
    mockState.items = [item];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    expect(mockState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', stock: 10, maxQuantityPerOrder: 2 }),
    );
  });

  it('a row without a seller id puts the line under the unknown seller, not an empty id', () => {
    const item = makeItem('p1');
    item.product.seller = { displayName: 'Satıcı X' } as typeof item.product.seller;
    mockState.items = [item];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    expect(mockState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', seller: expect.objectContaining({ id: 'unknown' }) }),
    );
  });

  it('ürün kartına dokununca ürün detayına push eder', () => {
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByText('Hot Wheels'));
    expect(pushMock).toHaveBeenCalledWith('/product/p1');
  });
});

describe('card action rule (productCardAction, web parity)', () => {
  // `product.soldOut`, upper-cased like the listing card's overlay.
  const SOLD_OUT = 'STOKTA YOK';
  const cart = (id: string) => screen.queryByTestId(`product-card-cart-${id}`);
  const withProduct = (productId: string, patch: Record<string, unknown>) => {
    const item = makeItem(productId);
    Object.assign(item.product, patch);
    return item;
  };

  it('shows the cart toggle for another seller\'s active, in-stock listing', () => {
    mockState.userId = 'me';
    mockState.items = [withProduct('p1', { availableQuantity: 3 })];
    renderWithProviders(<FavoritesScreen />);
    expect(cart('p1')).toBeOnTheScreen();
  });

  it('treats a missing availableQuantity as unlimited stock', () => {
    mockState.userId = 'me';
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    expect(cart('p1')).toBeOnTheScreen();
  });

  it.each([
    ['sold', { status: 'sold' }],
    ['reserved', { status: 'reserved' }],
    ['inactive', { status: 'inactive' }],
    ['out of stock (availableQuantity 0)', { availableQuantity: 0 }],
  ])('a %s listing: no cart toggle, the shared sold-out overlay (web parity)', (_name, patch) => {
    mockState.userId = 'me';
    mockState.items = [withProduct('p1', patch)];
    renderWithProviders(<FavoritesScreen />);
    expect(cart('p1')).toBeNull();
    expect(screen.getByText(SOLD_OUT)).toBeOnTheScreen();
    expect(screen.getByTestId('favorite-remove-p1')).toBeOnTheScreen();
  });

  it('keeps the overlay and hides the toggle for a sold listing that is still in the cart', () => {
    mockState.userId = 'me';
    mockState.isInCart.mockReturnValue(true);
    mockState.cartItems = [{ id: 'c1', productId: 'p1', quantity: 1 }];
    mockState.items = [withProduct('p1', { status: 'sold' })];
    renderWithProviders(<FavoritesScreen />);
    expect(cart('p1')).toBeNull();
    expect(screen.getByText(SOLD_OUT)).toBeOnTheScreen();
  });

  it('draws no sold-out overlay for an in-stock listing', () => {
    mockState.items = [withProduct('p1', { availableQuantity: 1 })];
    renderWithProviders(<FavoritesScreen />);
    expect(screen.queryByText(SOLD_OUT)).toBeNull();
  });

  it('hides the cart toggle for the viewer\'s own listing', () => {
    mockState.userId = 's1'; // makeItem's seller id
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    expect(cart('p1')).toBeNull();
    expect(screen.getByTestId('favorite-remove-p1')).toBeOnTheScreen();
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

  it('add to cart -> the shared card toast once, after the member\'s server write settles', async () => {
    // The fake store really adds the line, so `useCartSync.add` mirrors it to the server.
    mockState.addItem.mockImplementationOnce((line: Record<string, unknown>) => {
      mockState.cartItems = [...mockState.cartItems, { ...line, id: 'c1', quantity: 1 }];
    });
    mockState.items = [makeItem('p1')];
    renderWithProviders(<FavoritesScreen />);
    fireEvent.press(screen.getByTestId('product-card-cart-p1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Ürün sepete eklendi'));
    expect(jest.requireMock('@/lib/api').cartApi.addItem).toHaveBeenCalledWith('p1', 1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});
