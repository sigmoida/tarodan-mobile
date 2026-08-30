/**
 * P2 #10 — sepette satır seçerek ödeme.
 *
 * API işi yok: `POST /orders/quote` ve `/orders/checkout` zaten yalnız
 * gönderilen `items`'ı fiyatlıyor ve yalnız onları sepetten düşüyor. Eksik olan
 * tamamen istemci tarafı: kullanıcı sepetteki üç üründen birini alacaksa
 * diğerlerini önce silmek zorundaydı.
 *
 * Buradaki güvence quote'un GÖNDERDİĞİ satırlar üzerinden kuruluyor — ekranda
 * bir kutu görünmesi değil, seçimin FİYATA ve ödemeye yansıması önemli.
 */
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  ordersApi: { getQuote: jest.fn() },
  cartApi: {
    get: jest.fn(() => Promise.resolve({ data: null })),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateItem: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { isAuthenticated: false, user: null };
    return selector ? selector(state) : state;
  },
}));

import { ordersApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CartScreen from '../index';

const quoteFor = (productIds: string[]) => ({
  data: {
    items: productIds.map((productId) => ({ productId, quantity: 1, unitPrice: 100, subtotal: 100 })),
    pricing: {
      summary: {
        productAmount: 100 * productIds.length,
        shippingAmount: 50,
        serviceFeeAmount: 10,
        total: 100 * productIds.length + 60,
      },
    },
  },
});

const item = (productId: string, title: string) => ({
  id: `cart-${productId}`,
  productId,
  title,
  price: 100,
  quantity: 1,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
});

const sentProductIds = () => {
  const calls = (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mock.calls;
  const last = calls[calls.length - 1]![0];
  return last.items.map((i: any) => i.productId);
};

describe('P2 #10 · sepette satır seçerek ödeme', () => {
  beforeEach(() => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockReset();
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((body: any) =>
      Promise.resolve(quoteFor(body.items.map((i: any) => i.productId))),
    );
    useCartStore.setState({
      items: [item('p1', 'Birinci'), item('p2', 'İkinci')],
      deselectedIds: [],
      lastUpdated: Date.now(),
      isLoading: false,
    });
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('varsayılanda tüm satırlar fiyatlandırılır', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());
    expect(sentProductIds()).toEqual(['p1', 'p2']);
  });

  it('seçimi kaldırılan satır fiyata ve ödemeye girmez', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));

    await waitFor(() => expect(sentProductIds()).toEqual(['p2']));
    // Toplam da tek satıra göre: 100 + 60.
    await waitFor(() => expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('160,00 TL'));
  });

  it('hiçbir satır seçili değilken ödemeye geçilemez', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));
    fireEvent.press(screen.getByTestId('cart-item-select-p2'));

    await waitFor(() => expect(screen.getByTestId('cart-checkout-button')).toBeDisabled());
  });

  it('tümünü seç kutusu tüm satırları geri getirir', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));
    await waitFor(() => expect(sentProductIds()).toEqual(['p2']));

    fireEvent.press(screen.getByTestId('cart-select-all'));
    await waitFor(() => expect(sentProductIds()).toEqual(['p1', 'p2']));
  });
});

describe('P2 #10 · seçim dışı satırın sunumu', () => {
  beforeEach(() => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockReset();
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((body: any) =>
      Promise.resolve(quoteFor(body.items.map((i: any) => i.productId))),
    );
    useCartStore.setState({
      items: [item('p1', 'Birinci'), item('p2', 'İkinci')],
      deselectedIds: [],
      lastUpdated: Date.now(),
      isLoading: false,
    });
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  /**
   * Seçim dışı satırın quote karşılığı yok, o yüzden fiyat alanı çıplak bir
   * "—" oluyordu; kullanıcı bunu "fiyat alınamadı" diye okur. Sebebini söyle.
   */
  it('seçim dışı satır fiyat yerine sebebini gösterir', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));

    await waitFor(() =>
      expect(screen.getByText('Ödenecek toplama dahil değildir')).toBeOnTheScreen(),
    );
  });

  /** Ara toplam satırındaki adet, fiyatlanan satır sayısını göstermeli. */
  it('ara toplam adedi seçili satırları sayar', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(screen.getByText('Ara Toplam (2 ürün)')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));

    await waitFor(() => expect(screen.getByText('Ara Toplam (1 ürün)')).toBeOnTheScreen());
  });
});

/**
 * Ertelenmiş madde ("tüm satırlar ayrılırsa özet 0 ürün dalı") — satır seçimi
 * geldiğinden beri bu durum TASARIMCA ulaşılabilir. Hiçbir satır seçili
 * değilken quote hiç çalışmıyor, `total` null kalıyor ve özet kartı
 * "Fiyat alınamadı / Tekrar Dene" hata kartına düşüyordu: hata yok, kullanıcı
 * yalnız seçimi kaldırmış. Yanlış teşhis + işlevsiz bir retry düğmesi.
 */
describe('P2 #10 · hiçbir satır seçili değilken özet', () => {
  beforeEach(() => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockReset();
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((body: any) =>
      Promise.resolve(quoteFor(body.items.map((i: any) => i.productId))),
    );
    useCartStore.setState({
      items: [item('p1', 'Birinci')],
      deselectedIds: [],
      lastUpdated: Date.now(),
      isLoading: false,
    });
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('hata kartı değil, ne yapılacağını söyleyen not gösterir', async () => {
    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('cart-item-select-p1'));

    await waitFor(() =>
      expect(screen.getByText('Ödemek için en az bir ürün seçin')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('cart-summary-error')).toBeNull();
  });
});
