/**
 * cart-summary · sepet özetinin fiyat sözleşmesi (bulgu C2).
 *
 * Eski davranış: `total = Number(summary.productAmount) + Number(summary.serviceFeeAmount)`
 * — istemcide üretilmiş, hiçbir sunucu alanına karşılık gelmeyen bir para değeri,
 * üstelik "Toplam" etiketiyle basılıyordu; quote yokken de yerel `getSubtotal()`
 * sonucuna düşüyordu. Aynı kartta "Ara Toplam" yerel, "Toplam" sunucu tabanlıydı.
 *
 * Beklenen: dört satır da `pricing.summary`'den AYNEN; istemcide hiçbir
 * toplama/çıkarma yok; sunucu değeri yokken tutar yerine yer tutucu.
 *
 * `app/cart/` altında bu güvencenin testi yoktu (`app/__tests__/cart.test.tsx`
 * `getQuote`/`total`/`buyerFee` kelimelerinin hiçbirini içermiyordu).
 */
import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react-native';
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

// Sunucu kırılımı BİLEREK yerel `price * quantity` (2 × 100 = 200) toplamından
// farklı: kod yerel aritmetiğe dönerse test kırılır.
const QUOTE = {
  data: {
    pricingHash: 'hash-1',
    shippingTariffVersion: 3,
    // Satır birim fiyatı da sunucudan: sepetteki donmuş 100 değil 95 (kampanya
    // sepette beklerken değişmiş senaryosu — bulgu N1'in sepet karşılığı).
    items: [{ productId: 'p1', quantity: 2, unitPrice: 95, subtotal: 190 }],
    pricing: {
      summary: { productAmount: 190, shippingAmount: 50, serviceFeeAmount: 24.4, total: 264.4 },
    },
  },
};

const seedItem = (over: Partial<any> = {}) => ({
  id: 'cart-1',
  productId: 'p1',
  title: 'Hot Wheels Mustang',
  price: 100,
  quantity: 2,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
  ...over,
});

describe('Sepet özeti — fiyat yalnızca pricing.summary den gelir', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.getQuote).mockReset();
    useCartStore.setState({ items: [seedItem()], lastUpdated: Date.now(), isLoading: false });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('dört satır da summary den aynen basılır; üç satırın toplamı Toplam a eşittir', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockResolvedValue(QUOTE);

    renderWithProviders(<CartScreen />);

    // Ara Toplam = summary.productAmount (190) — yerel 2×100 = 200 DEĞİL.
    await waitFor(() => expect(screen.getByText('190,00 TL')).toBeOnTheScreen());
    expect(screen.queryByText('₺200')).toBeNull();

    // Kargo satırı da quote'tan gelir ("Ödeme adımında hesaplanır" yer tutucusu
    // yerine gerçek sunucu değeri) — böylece üç satır toplama eşit.
    expect(screen.getByText('50,00 TL')).toBeOnTheScreen();
    expect(screen.getByText('24,40 TL')).toBeOnTheScreen();

    // 190 + 50 + 24,40 = 264,40 → Toplam (özet kartı + alt bar, iki yerde).
    await waitFor(() => expect(screen.getByTestId('cart-summary-total')).toHaveTextContent('264,40 TL'));
    expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('264,40 TL');

    // Eski istemci aritmetiği (productAmount + serviceFeeAmount = 214,40) hiçbir
    // yerde görünmemeli.
    expect(screen.queryByText('214,40 TL')).toBeNull();

    // Satır birim fiyatı da sunucudan (`items[].unitPrice` = 95); sepetteki
    // donmuş `price` (100) ve eski `₺100` biçimi ekranda YOK (bulgu N1/N9).
    expect(screen.getByTestId('cart-item-unit-price')).toHaveTextContent('95,00 TL');
    expect(screen.queryByText('₺100')).toBeNull();
  });

  it('quote hata verince paylaşılan ErrorState + Tekrar Dene çıkar, Satın Al kilitlenir', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockRejectedValue({
      response: { status: 400, data: { message: 'Geçersiz ürün' } },
    });

    renderWithProviders(<CartScreen />);

    // Bulgu N3: eskiden dört satır da sebepsizce "—" oluyordu, "Satın Al" ise
    // etkin kalıp kullanıcıyı checkout'taki ErrorState'e taşıyordu.
    await waitFor(() => expect(screen.getByTestId('cart-summary-error')).toBeOnTheScreen());
    expect(screen.getByText('Tekrar Dene')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('—');
    expect(screen.getByTestId('cart-checkout-button')).toBeDisabled();

    // Yerel `price × quantity` (200) hiçbir formatta basılmaz.
    expect(screen.queryByText('₺200')).toBeNull();
    expect(screen.queryByText('200,00 TL')).toBeNull();
    // Satır fiyatı da sunucudan geldiği için donmuş yerel fiyat da yok.
    expect(screen.getByTestId('cart-item-unit-price')).toHaveTextContent('—');
  });

  it('"Tekrar Dene" quote u yeniden çeker ve tutarlar geri gelir', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: 'Geçersiz ürün' } } })
      .mockResolvedValue(QUOTE);

    renderWithProviders(<CartScreen />);
    await waitFor(() => expect(screen.getByTestId('cart-summary-error')).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByText('Tekrar Dene'));
    });

    await waitFor(() => expect(screen.getByTestId('cart-summary-total')).toHaveTextContent('264,40 TL'), {
      timeout: 2000,
    });
    expect(screen.queryByTestId('cart-summary-error')).toBeNull();
    expect(screen.getByTestId('cart-checkout-button')).not.toBeDisabled();
  });

  // `summary` gelip alanı boş dönen yanıt (bulgu N2): `Number(null)` = 0 olduğu
  // için eski kod bunu geçerli bir sıfır sanıp "0,00 TL" basardı.
  it('summary gelir ama total null ise "0,00 TL" değil ÇIKIŞ YOLU gösterilir', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockResolvedValue({
      data: {
        pricingHash: 'h',
        shippingTariffVersion: 3,
        pricing: { summary: { productAmount: 190, shippingAmount: 50, serviceFeeAmount: 24.4, total: null } },
      },
    });

    renderWithProviders(<CartScreen />);

    // Sorgu HATA vermedi (200 döndü), yani `quoteError` false — ama tutar yok.
    // Yalnız "—" basıp bırakmak kullanıcıyı sebepsiz kilitliyordu: buton kapalı,
    // hata kartı yok, retry yok. Artık aynı `ErrorState` çıkış yolu veriliyor.
    await waitFor(() => expect(screen.getByTestId('cart-summary-error')).toBeOnTheScreen());
    expect(screen.getByText('Tekrar Dene')).toBeOnTheScreen();
    expect(screen.queryByText('0,00 TL')).toBeNull();
    expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('—');
    expect(screen.getByTestId('cart-checkout-button')).toBeDisabled();
  });

  it('quote YÜKLENİRKEN hata kartı gösterilmez (yer tutucu basılır)', async () => {
    // `total` yükleme sırasında da null — `quoteLoading` kapısı olmasaydı her
    // sepet açılışında "Fiyat bilgisi alınamadı" yanıp sönerdi.
    let release!: (v: unknown) => void;
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockReturnValue(
      new Promise((res) => {
        release = res;
      }),
    );

    renderWithProviders(<CartScreen />);

    expect(screen.queryByTestId('cart-summary-error')).toBeNull();
    expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('—');

    await act(async () => {
      release({
        data: {
          pricingHash: 'h',
          shippingTariffVersion: 3,
          pricing: { summary: { productAmount: 190, shippingAmount: 50, serviceFeeAmount: 24.4, total: 264.4 } },
        },
      });
    });
    await waitFor(() => expect(screen.getByTestId('cart-summary-total')).toHaveTextContent('264,40 TL'));
    expect(screen.queryByTestId('cart-summary-error')).toBeNull();
  });
});
