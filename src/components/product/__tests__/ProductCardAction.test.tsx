/**
 * The listing card's action (listing boost plan LB12, ADR 0015): the shared `productCardAction`
 * rule through the real card, the cart toggle (guest and member), its accessible names, the
 * text / icon-only switch at `theme.containers.cardWide`, and no purchase surface for a digital
 * good on the viewer's own listing.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { useCartStore } from '@/stores/cartStore';
import { containers } from '@/theme';
import { ProductCard, type ProductCardProduct } from '../ProductCard';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  cartApi: {
    addItem: jest.fn(() => Promise.resolve({ data: {} })),
    removeItem: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('@/lib/product/detailQuery', () => ({ prefetchProductDetail: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

let mockAuth: { isAuthenticated: boolean; user: { id: string } | null } = { isAuthenticated: false, user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import { cartApi } from '@/lib/api';

const listing: ProductCardProduct = {
  id: 'p1',
  title: 'Hot Wheels Supra',
  price: 250,
  images: [],
  status: 'active',
  availableQuantity: 3,
  sellerId: 'seller-1',
  seller: { id: 'seller-1', displayName: 'Ayşe' },
  isBoosted: false,
};

const cartButton = () => screen.queryByTestId('product-card-cart-p1');

/** The card root measured at `width` (its `onLayout`). */
function layoutCard(width: number) {
  const root = screen.UNSAFE_root.findAll(
    (n: { props: { onLayout?: unknown; style?: unknown } }) =>
      typeof n.props.onLayout === 'function' && JSON.stringify(n.props.style ?? null).includes('"flex":1'),
  )[0]!;
  fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 300 } } });
}

let toastSuccess: jest.SpyInstance;
let toastError: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { isAuthenticated: false, user: null };
  useCartStore.setState({ items: [], deselectedIds: [], mergePendingFor: null });
  toastSuccess = jest.spyOn(toast, 'success').mockImplementation(() => 1);
  toastError = jest.spyOn(toast, 'error').mockImplementation(() => 1);
});

afterEach(() => {
  toastSuccess.mockRestore();
  toastError.mockRestore();
});

describe('ProductCard action: one rule per viewer and listing state', () => {
  it('guest, active and in stock: the cart action', () => {
    renderWithProviders(<ProductCard product={listing} />);
    expect(cartButton()).toBeTruthy();
  });

  it('another signed-in user, active and in stock: the cart action', () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    expect(cartButton()).toBeTruthy();
  });

  it('unlimited stock (no availableQuantity) still gets the cart action', () => {
    renderWithProviders(<ProductCard product={{ ...listing, availableQuantity: null }} />);
    expect(cartButton()).toBeTruthy();
  });

  it.each([
    ['own listing (sellerId)', { ...listing }],
    ['own listing (seller.id only)', { ...listing, sellerId: null }],
    ['own boosted listing', { ...listing, isBoosted: true }],
  ])('%s: no button at all, no boost copy (ADR 0015)', (_name, product) => {
    mockAuth = { isAuthenticated: true, user: { id: 'seller-1' } };
    renderWithProviders(<ProductCard product={product} />);
    expect(cartButton()).toBeNull();
    expect(screen.queryByTestId('product-card-action-spacer')).toBeNull();
    expect(screen.queryByText('Öne Çıkar')).toBeNull();
    expect(screen.queryByText('Süre Ekle')).toBeNull();
    // No boost / extend button names (`product.cardAction.boostAria` / `extendAria`).
    expect(screen.queryByLabelText(/ilanını öne çıkar$|süresini uzat$/i)).toBeNull();
  });

  it.each([
    ['sold', { status: 'sold' }],
    ['reserved', { status: 'reserved' }],
    ['inactive', { status: 'inactive' }],
    ['no status', { status: null }],
    ['out of stock', { availableQuantity: 0 }],
  ])('%s: no action', (_name, extra) => {
    renderWithProviders(<ProductCard product={{ ...listing, ...extra }} />);
    expect(cartButton()).toBeNull();
    expect(screen.queryByTestId('product-card-action-spacer')).toBeNull();
  });

  it('gives way to a caller footer and to showAction={false}', () => {
    const { rerender } = renderWithProviders(<ProductCard product={listing} footer={<></>} />);
    expect(cartButton()).toBeNull();
    rerender(<ProductCard product={listing} showAction={false} />);
    expect(cartButton()).toBeNull();
  });

  it('the action is the card press target sibling: pressing it never opens the listing', () => {
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('ProductCard action: cart toggle', () => {
  it('guest: adds the listing to the local cart, then removes it; aria and state follow', async () => {
    renderWithProviders(<ProductCard product={listing} />);
    const button = cartButton()!;
    expect(button.props.accessibilityLabel).toBe('Hot Wheels Supra ürününü sepete ekle');
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));

    fireEvent.press(button);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    const [line] = useCartStore.getState().items;
    expect(line).toEqual(
      expect.objectContaining({
        productId: 'p1',
        title: 'Hot Wheels Supra',
        quantity: 1,
        stock: 3,
        seller: { id: 'seller-1', displayName: 'Ayşe' },
      }),
    );
    // A guest's cart is local only.
    expect(cartApi.addItem).not.toHaveBeenCalled();

    const inCart = cartButton()!;
    expect(inCart.props.accessibilityLabel).toBe('Hot Wheels Supra ürününü sepetten çıkar');
    expect(inCart.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));

    fireEvent.press(inCart);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepetten çıkarıldı'));
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(cartButton()!.props.accessibilityLabel).toBe('Hot Wheels Supra ürününü sepete ekle');
  });

  it('member: the write is mirrored to the server; a second press while it runs is ignored', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    let resolveAdd: ((v: unknown) => void) | undefined;
    (cartApi.addItem as jest.Mock).mockImplementationOnce(() => new Promise((r) => (resolveAdd = r)));
    renderWithProviders(<ProductCard product={listing} />);

    fireEvent.press(cartButton()!);
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 1);
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    // Busy: the press neither removes the line nor sends a request.
    fireEvent.press(cartButton()!);
    expect(cartApi.removeItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(toastSuccess).not.toHaveBeenCalled();

    await act(async () => resolveAdd?.({ data: {} }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));

    fireEvent.press(cartButton()!);
    await waitFor(() => expect(cartApi.removeItem).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepetten çıkarıldı'));
  });

  it('member: a line the server refuses is undone, its message shown, no success toast', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    (cartApi.addItem as jest.Mock).mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Bu satıcı şu an satış yapamıyor' } },
    });
    renderWithProviders(<ProductCard product={listing} />);

    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Bu satıcı şu an satış yapamıyor'));
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });
});

describe('ProductCard action: text or icon-only by the card width', () => {
  it(`grid: icon-only below ${containers.cardWide}pt, the text label from ${containers.cardWide}pt`, () => {
    renderWithProviders(<ProductCard product={listing} />);
    // Before the first layout: icon-only (what a phone grid keeps).
    expect(screen.queryByText('Sepete Ekle')).toBeNull();
    layoutCard(containers.cardWide - 1);
    expect(screen.queryByText('Sepete Ekle')).toBeNull();
    expect(cartButton()!.props.accessibilityLabel).toBe('Hot Wheels Supra ürününü sepete ekle');
    layoutCard(containers.cardWide);
    expect(screen.getByText('Sepete Ekle')).toBeTruthy();
  });

  it('grid, wide card in the cart: the text toggle says "Sepetten Çıkar"', async () => {
    renderWithProviders(<ProductCard product={listing} />);
    layoutCard(containers.cardWide + 40);
    fireEvent.press(screen.getByText('Sepete Ekle'));
    await waitFor(() => expect(screen.getByText('Sepetten Çıkar')).toBeTruthy());
  });

  it('list: icon-only at the end of the price line (web below xs)', () => {
    renderWithProviders(<ProductCard product={listing} layout="list" />);
    expect(cartButton()).toBeTruthy();
    expect(screen.queryByText('Sepete Ekle')).toBeNull();
    expect(screen.getByTestId('product-card-action-spacer')).toBeTruthy();
  });
});

describe('ProductCard boosted badge', () => {
  it('grid: "Öne Çıkan" (not "Sponsorlu"); the card label reads the paid placement hint', () => {
    renderWithProviders(<ProductCard product={{ ...listing, isBoosted: true }} />);
    expect(screen.getByText('Öne Çıkan')).toBeTruthy();
    expect(screen.queryByText('Sponsorlu')).toBeNull();
    expect(screen.getByLabelText('Hot Wheels Supra, Satıcı bu ilanı ücretli olarak öne çıkardı')).toBeTruthy();
  });

  it('list: "Öne Çıkan" above the title (web list layout)', () => {
    renderWithProviders(<ProductCard product={{ ...listing, isBoosted: true }} layout="list" />);
    expect(screen.getByText('Öne Çıkan')).toBeTruthy();
  });
});
