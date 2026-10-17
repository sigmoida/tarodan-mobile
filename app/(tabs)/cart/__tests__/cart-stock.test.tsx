/**
 * Sepet stok gösterimi + süresiz sepet.
 *
 * - Sepet 24 saatte SİLİNMEZ: eski `cleanExpiredItems` ve "24 saat sonra silinir" uyarısı kalktı.
 * - Yerel donmuş `item.stock`'tan türetilen "Son N adet" satırı kalktı; tek stok metni sunucunun
 *   yerelleştirilmiş `stockWarning` rozeti ("Son 1 ürün") — web parite.
 * - Adet seçici tavanı sunucunun `availableQuantity`/`maxQuantity`'si; eski yanıtta (alan yok)
 *   sepete eklerken yakalanan stoğa düşer.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  ordersApi: { getQuote: jest.fn(() => new Promise(() => {})) },
  cartApi: {
    get: jest.fn(),
    addItem: jest.fn(() => Promise.resolve({})),
    removeItem: jest.fn(() => Promise.resolve({})),
    updateItem: jest.fn(() => Promise.resolve({})),
    clear: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { isAuthenticated: true, user: { id: 'u1' } };
    return selector ? selector(state) : state;
  },
}));

import { cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CartScreen from '../index';

const DAY = 24 * 60 * 60 * 1000;

const seedItem = (over: Partial<any> = {}) => ({
  id: 'cart-1',
  productId: 'p1',
  title: 'Hot Wheels Mustang',
  price: 100,
  quantity: 1,
  stock: 1,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
  // 3 gün önce eklenmiş — eskiden açılışta silinirdi.
  addedAt: Date.now() - 3 * DAY,
  ...over,
});

const serverCart = (line: Record<string, unknown>) => ({
  data: {
    data: {
      calculation: {
        items: [{ productId: 'p1', quantity: 1, isAvailable: true, ...line }],
      },
    },
  },
});

const increase = () => screen.getByLabelText('Adedi arttır');

describe('Sepet · süresiz sepet ve sunucu stoğu', () => {
  beforeEach(() => {
    jest.mocked(cartApi.get).mockReset();
    jest.mocked(cartApi.updateItem).mockClear();
    useCartStore.setState({ items: [seedItem()], deselectedIds: [], lastUpdated: Date.now() });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('24 saatten eski satır sepette kalır; süre uyarısı yok', async () => {
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({}) as any);
    renderWithProviders(<CartScreen />);

    expect(await screen.findByText('Hot Wheels Mustang')).toBeOnTheScreen();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(screen.queryByText(/24 saat/)).toBeNull();
    expect((useCartStore.getState() as unknown as Record<string, unknown>).cleanExpiredItems).toBeUndefined();
  });

  it('yerel "Son N adet" satırı yok; sunucunun "Son 1 ürün" rozeti gösterilir', async () => {
    jest
      .mocked(cartApi.get)
      .mockResolvedValue(serverCart({ stockWarning: 'Son 1 ürün', availableQuantity: 1 }) as any);
    renderWithProviders(<CartScreen />);

    expect(await screen.findByTestId('cart-item-stock-warning')).toHaveTextContent('Son 1 ürün');
    expect(screen.queryByText(/Son 1 adet/)).toBeNull();
  });

  it('adet tavanı sunucunun availableQuantity si — donmuş yerel stok (1) artışı engellemez', async () => {
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({ availableQuantity: 3 }) as any);
    renderWithProviders(<CartScreen />);

    await waitFor(() => expect(increase()).not.toBeDisabled());
    fireEvent.press(increase());

    const item = useCartStore.getState().items[0]!;
    expect(item.quantity).toBe(2);
    expect(item.stock).toBe(3);
    expect(cartApi.updateItem).toHaveBeenCalledWith('p1', 2);
  });

  it('eski sunucu yanıtı (availableQuantity/maxQuantity yok) → yerel stok tavanı korunur', async () => {
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({ stockWarning: 'Son 1 adet' }) as any);
    renderWithProviders(<CartScreen />);

    expect(await screen.findByTestId('cart-item-stock-warning')).toHaveTextContent('Son 1 adet');
    expect(increase()).toBeDisabled();
  });

  it('sunucu stoğu sepetteki adedin altına düştü (5 → 3): "+" kilitli, "−" çalışır ve 3 e kırpar', async () => {
    // Yerel donmuş stok 9: "+" yalnız sunucu yanıtı gelince kilitlenir (yanıtı beklemiş oluruz).
    useCartStore.setState({ items: [seedItem({ stock: 9, quantity: 5 })] });
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({ availableQuantity: 3 }) as any);
    renderWithProviders(<CartScreen />);

    const decrease = () => screen.getByLabelText('Adedi azalt');
    await waitFor(() => expect(increase()).toBeDisabled());
    expect(decrease()).not.toBeDisabled();
    fireEvent.press(decrease());

    const item = useCartStore.getState().items[0]!;
    expect(item.quantity).toBe(3);
    expect(cartApi.updateItem).toHaveBeenCalledWith('p1', 3);
  });

  it('sunucu maxQuantity daha düşükse o tavan olur', async () => {
    useCartStore.setState({ items: [seedItem({ stock: 5, quantity: 2 })] });
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({ maxQuantity: 2 }) as any);
    renderWithProviders(<CartScreen />);

    await waitFor(() => expect(increase()).toBeDisabled());
  });
});

describe('Sepet satırı · kart düzeni', () => {
  const { ordersApi } = jest.requireMock('@/lib/api') as { ordersApi: { getQuote: jest.Mock } };
  const quote = (unitPrice: number) => ({
    data: {
      pricingHash: 'h',
      items: [{ productId: 'p1', quantity: 1, unitPrice, subtotal: unitPrice }],
      pricing: {
        summary: { productAmount: unitPrice, shippingAmount: 0, serviceFeeAmount: 0, total: unitPrice },
      },
    },
  });

  beforeEach(() => {
    jest.mocked(cartApi.get).mockReset();
    jest.mocked(cartApi.removeItem).mockClear();
    useCartStore.setState({ items: [seedItem()], deselectedIds: [], lastUpdated: Date.now() });
  });

  afterEach(() => {
    ordersApi.getQuote.mockImplementation(() => new Promise(() => {}));
    useCartStore.setState({ items: [] });
  });

  it('sunucu satırı indirim bildiriyorsa eski fiyat üstü çizili, güncel fiyat quote birim fiyatı', async () => {
    ordersApi.getQuote.mockResolvedValue(quote(80));
    jest
      .mocked(cartApi.get)
      .mockResolvedValue(serverCart({ originalPrice: 100, effectivePrice: 80 }) as any);
    renderWithProviders(<CartScreen />);

    expect(await screen.findByTestId('cart-item-old-price')).toHaveTextContent('100,00 TL');
    expect(screen.getByTestId('cart-item-unit-price')).toHaveTextContent('80,00 TL');
  });

  it('indirim yoksa eski fiyat çizilmez', async () => {
    ordersApi.getQuote.mockResolvedValue(quote(100));
    jest
      .mocked(cartApi.get)
      .mockResolvedValue(serverCart({ originalPrice: 100, effectivePrice: 100 }) as any);
    renderWithProviders(<CartScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('cart-item-unit-price')).toHaveTextContent('100,00 TL'),
    );
    expect(screen.queryByTestId('cart-item-old-price')).toBeNull();
  });

  it('başlıkta yalnız ürün başlığı (satıcı adı yok); sağ üstteki kaldır düğmesi satırı siler', async () => {
    jest.mocked(cartApi.get).mockResolvedValue(serverCart({}) as any);
    renderWithProviders(<CartScreen />);

    expect(await screen.findByText('Hot Wheels Mustang')).toBeOnTheScreen();
    expect(screen.queryByText(/^Satıcı/)).toBeNull();
    fireEvent.press(screen.getByTestId('cart-item-remove-p1'));
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
  });
});
