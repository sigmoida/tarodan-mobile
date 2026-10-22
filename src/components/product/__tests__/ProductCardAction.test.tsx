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
import { useCartWritesStore } from '@/stores/cartWritesStore';
import { captureException } from '@/services/sentry';
import { advanceSessionEpoch } from '@/lib/api/sessionState';
import { containers } from '@/theme';
import { ProductCard, type ProductCardProduct } from '../ProductCard';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
  cartApi: {
    addItem: jest.fn(() => Promise.resolve({ data: {} })),
    removeItem: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

jest.mock('@/lib/product/detailQuery', () => ({ prefetchProductDetail: jest.fn() }));

jest.mock('@/lib/cart/cartItemFromListing', () => {
  const actual = jest.requireActual('@/lib/cart/cartItemFromListing');
  return { ...actual, cartItemFromListing: jest.fn(actual.cartItemFromListing) };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

let mockAuth: { isAuthenticated: boolean; user: { id: string } | null } = { isAuthenticated: false, user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign((sel?: (s: unknown) => unknown) => (sel ? sel(mockAuth) : mockAuth), {
    getState: () => mockAuth,
  }),
}));

import { cartApi } from '@/lib/api';
import { cartItemFromListing } from '@/lib/cart/cartItemFromListing';

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
  useCartWritesStore.setState({ inFlight: {} });
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
    // The label says what a press does; no `selected` beside a changing label.
    expect(button.props.accessibilityState?.selected).toBeUndefined();

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
    expect(inCart.props.accessibilityState?.selected).toBeUndefined();

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

  it('member: while one card writes, a second card of the same listing ignores its press', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    let resolveAdd: ((v: unknown) => void) | undefined;
    (cartApi.addItem as jest.Mock).mockImplementationOnce(() => new Promise((r) => (resolveAdd = r)));
    renderWithProviders(
      <>
        <ProductCard product={listing} />
        <ProductCard product={listing} />
      </>,
    );
    const [first, second] = screen.getAllByTestId('product-card-cart-p1');
    fireEvent.press(first!);
    // Every card of the listing shows the write, not only the pressed one.
    for (const card of screen.getAllByTestId('product-card-cart-p1')) {
      expect(card.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    }
    fireEvent.press(second!);
    expect(cartApi.removeItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    await act(async () => resolveAdd?.({ data: {} }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    for (const card of screen.getAllByTestId('product-card-cart-p1')) {
      expect(card.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
    }
  });

  it('member: a removal the server does not apply puts the line back and says why, no success toast', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    toastSuccess.mockClear();

    (cartApi.removeItem as jest.Mock).mockRejectedValueOnce({ response: { status: 503, data: {} } });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('İşlem başarısız'));
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(['p1']);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityLabel).toBe('Hot Wheels Supra ürününü sepetten çıkar');
    expect(captureException).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tags: { flow: 'cart.remove' } }));
  });

  it('member: the undone removal keeps the line in place and deselected for checkout', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    useCartStore.getState().addItem({ ...useCartStore.getState().items[0]!, productId: 'p2' });
    const line = useCartStore.getState().items[0]!;
    useCartStore.getState().toggleSelected(line.id);

    (cartApi.removeItem as jest.Mock).mockRejectedValueOnce({ response: { status: 409, data: { message: 'Kaldırılamaz' } } });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Kaldırılamaz'));
    const s = useCartStore.getState();
    expect(s.items.map((i) => i.productId)).toEqual(['p1', 'p2']);
    expect(s.isSelected(line.id)).toBe(false);
    // A definite refusal: the server still holds the line, nothing to merge.
    expect(s.mergePendingFor).toBeNull();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: a removal that throws before sending is undone too', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    toastSuccess.mockClear();

    (cartApi.removeItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('interceptor');
    });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('İşlem başarısız'));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: a transient removal error puts the line back and marks the cart for merge', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    toastSuccess.mockClear();

    (cartApi.removeItem as jest.Mock).mockRejectedValueOnce({ message: 'Network Error' });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('İşlem başarısız'));
    expect(useCartStore.getState().items).toHaveLength(1);
    // The server may have applied it: the merge sends the restored line again.
    expect(useCartStore.getState().mergePendingFor).toBe('buyer-1');
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('member: a removal that fails after logout does not touch the next session', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    toastSuccess.mockClear();

    let rejectRemove: ((e: unknown) => void) | undefined;
    (cartApi.removeItem as jest.Mock).mockImplementationOnce(() => new Promise((_r, j) => (rejectRemove = j)));
    fireEvent.press(cartButton()!);
    // Logout while the request runs: the session changes and the cart is cleared.
    mockAuth = { isAuthenticated: false, user: null };
    advanceSessionEpoch();
    await act(async () => rejectRemove?.({ response: { status: 401, data: {} } }));
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().mergePendingFor).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    // The old session's own 401 (the forced logout) is no cart failure.
    expect(captureException).not.toHaveBeenCalled();
  });

  it('member: a removal that succeeds after a re-login says nothing in the new session', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    toastSuccess.mockClear();

    let resolveRemove: ((v: unknown) => void) | undefined;
    (cartApi.removeItem as jest.Mock).mockImplementationOnce(() => new Promise((r) => (resolveRemove = r)));
    fireEvent.press(cartButton()!);
    // Same user, new session: the epoch moved on.
    advanceSessionEpoch();
    await act(async () => resolveRemove?.({ data: {} }));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('member: an add the server refuses after logout leaves the next session cart alone', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    let rejectAdd: ((e: unknown) => void) | undefined;
    (cartApi.addItem as jest.Mock).mockImplementationOnce(() => new Promise((_r, j) => (rejectAdd = j)));
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    // Logout, and the next session adds the same listing locally.
    advanceSessionEpoch();
    mockAuth = { isAuthenticated: false, user: null };
    act(() => {
      useCartStore.setState({ items: [], deselectedIds: [], mergePendingFor: null });
      useCartWritesStore.getState().reset();
    });
    fireEvent.press(cartButton()!);
    expect(useCartStore.getState().items).toHaveLength(1);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    toastSuccess.mockClear();

    await act(async () => rejectAdd?.({ response: { status: 409, data: { message: 'Satılamaz' } } }));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    // The new session's own write is not ended by the old one: the listing is free again.
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: a 404 on removal means the server cart did not hold the line; the removal stands', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(1));
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));

    (cartApi.removeItem as jest.Mock).mockRejectedValueOnce({ response: { status: 404, data: {} } });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepetten çıkarıldı'));
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(toastError).not.toHaveBeenCalled();
    // An expected outcome, not a Sentry event.
    expect(captureException).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tags: { flow: 'cart.remove' } }));
  });

  it('member: the busy state outlives the card: a card mounted again while the write runs ignores a press', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    let resolveAdd: ((v: unknown) => void) | undefined;
    (cartApi.addItem as jest.Mock).mockImplementationOnce(() => new Promise((r) => (resolveAdd = r)));
    const first = renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    // A list recycles the card (FlashList) while the request runs.
    first.unmount();
    renderWithProviders(<ProductCard product={listing} />);
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    fireEvent.press(cartButton()!);
    expect(cartApi.removeItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);

    await act(async () => resolveAdd?.({ data: {} }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: a transient add error keeps the line, marks the cart for merge and reports it', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    (cartApi.addItem as jest.Mock).mockRejectedValueOnce({ message: 'Network Error' });
    renderWithProviders(<ProductCard product={listing} />);

    fireEvent.press(cartButton()!);
    // The local cart is authoritative (phase A): the add stands and says so.
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(['p1']);
    expect(useCartStore.getState().mergePendingFor).toBe('buyer-1');
    expect(toastError).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tags: { flow: 'cart.add' } }));
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: an unrecognised 403 on removal puts the line back and marks the cart for merge', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    renderWithProviders(<ProductCard product={listing} />);
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false })));
    toastSuccess.mockClear();

    (cartApi.removeItem as jest.Mock).mockRejectedValueOnce({ response: { status: 403, data: {} } });
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('İşlem başarısız'));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().mergePendingFor).toBe('buyer-1');
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('member: an add that succeeds after a same-user re-login says nothing in the new session', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    let resolveAdd: ((v: unknown) => void) | undefined;
    (cartApi.addItem as jest.Mock).mockImplementationOnce(() => new Promise((r) => (resolveAdd = r)));
    const { queryClient } = renderWithProviders(<ProductCard product={listing} />);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    fireEvent.press(cartButton()!);
    // Same user, new session: the epoch moved on.
    advanceSessionEpoch();
    await act(async () => resolveAdd?.({ data: {} }));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    // The old session's result does not refetch the new session's cart.
    expect(invalidate).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('member: a logout while the post-add cart refetch runs drops the success toast', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    const { queryClient } = renderWithProviders(<ProductCard product={listing} />);
    let finishRefetch: (() => void) | undefined;
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementationOnce(() => new Promise<void>((r) => (finishRefetch = r)));
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(finishRefetch).toBeDefined());
    // The write is on the server; the session ends while the refetch runs.
    advanceSessionEpoch();
    await act(async () => finishRefetch?.());
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));
  });

  it('a press that throws before any write is reported, says it failed and leaves the listing free', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'buyer-1' } };
    (cartItemFromListing as jest.Mock).mockImplementationOnce(() => {
      throw new Error('malformed listing');
    });
    renderWithProviders(<ProductCard product={listing} />);

    expect(() => fireEvent.press(cartButton()!)).not.toThrow();
    expect(toastError).toHaveBeenCalledWith('İşlem başarısız');
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ tags: { flow: 'cart.add' } }));
    expect(cartApi.addItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(cartButton()!.props.accessibilityState).toEqual(expect.objectContaining({ busy: false }));

    // The next press works.
    fireEvent.press(cartButton()!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Ürün sepete eklendi'));
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
