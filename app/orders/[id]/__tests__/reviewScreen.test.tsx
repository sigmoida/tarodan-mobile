/**
 * J31/J109/J110 · Değerlendirme EKRANI (`orders/[id]/review?type=product|seller`) — eski
 * RatingModal sözleşmeleri ekrana taşındı: 1-5 yıldız (her biri ≥ 44pt), 0 puan engeli,
 * puan metni, karakter sayacı + Premium notu, satıcı kriterleri, ürün/satıcı uç noktaları.
 * Başarı: geri çık (önce) + `toast.success`; hata `toast.error`, ekran kalır.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, emitBeforeRemove, resetRouterMocks } from '@/test-utils/router-mock';

let mockParams: Record<string, string> = { id: 'order-1', type: 'product' };
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  ratingsApi: { createProductRating: jest.fn(), createUserRating: jest.fn() },
}));
// Satın almanın açık olduğu platform (Android). iOS'ta Premium notu gizli —
// reviewScreenIos.test.tsx.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
let mockLimits: { maxReviewChars: number } | undefined = { maxReviewChars: 500 };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { limits: mockLimits };
    return sel ? sel(state) : state;
  },
}));

import { api, ratingsApi } from '@/lib/api';
import OrderReviewScreen from '../review';

const getMock = api.get as jest.Mock;
const productMock = ratingsApi.createProductRating as jest.Mock;
const sellerMock = ratingsApi.createUserRating as jest.Mock;

let successSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  mockParams = { id: 'order-1', type: 'product' };
  mockLimits = { maxReviewChars: 500 };
  getMock.mockResolvedValue({
    data: {
      data: {
        id: 'order-1',
        status: 'delivered',
        product: { id: 'prod-1', title: 'Vintage Kamera' },
        seller: { id: 's1', displayName: 'Ahmet Satıcı' },
      },
    },
  });
  productMock.mockResolvedValue({ data: {} });
  sellerMock.mockResolvedValue({ data: {} });
  successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
  errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
});
afterEach(() => {
  successSpy.mockRestore();
  errorSpy.mockRestore();
});

async function renderScreen() {
  renderWithProviders(<OrderReviewScreen />);
  await screen.findByTestId('review-submit-button');
}
const star = (n: number) => screen.getByTestId(`review-star-${n}`);
const submit = () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('review-submit-button'));
  });

describe('J31 · Ürünü puanla (1-5 yıldız)', () => {
  it('ürün değerlendirme başlığını ve hedef ürün adını gösterir', async () => {
    await renderScreen();
    expect(screen.getByText('Ürünü Değerlendir')).toBeOnTheScreen();
    expect(screen.getByText('Vintage Kamera')).toBeOnTheScreen();
    expect(screen.getByText('Puan')).toBeOnTheScreen();
    expect(screen.getByText('Başlık (opsiyonel)')).toBeOnTheScreen();
  });

  it('başlangıçta "Puan seçin"; yıldıza basınca puan metni değişir', async () => {
    await renderScreen();
    expect(screen.getByTestId('review-score-label')).toHaveTextContent('Puan seçin');
    fireEvent.press(star(4));
    expect(screen.getByTestId('review-score-label')).toHaveTextContent('İyi');
    fireEvent.press(star(5));
    expect(screen.getByTestId('review-score-label')).toHaveTextContent('Mükemmel');
    fireEvent.press(star(1));
    expect(screen.getByTestId('review-score-label')).toHaveTextContent('Çok Kötü');
  });

  it('her yıldızın dokunma hedefi ≥ 44pt', async () => {
    await renderScreen();
    const style = StyleSheet.flatten(star(1).props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('J109 · 0 puan engeli — Gönder kapalı', () => {
  it('puan 0 iken Gönder basılınca API çağrılmaz', async () => {
    await renderScreen();
    await submit();
    expect(productMock).not.toHaveBeenCalled();
    expect(sellerMock).not.toHaveBeenCalled();
  });

  it('geçerli puanla ürün uç noktasına gider; geri çıkılır + başarı toast', async () => {
    await renderScreen();
    fireEvent.press(star(5));
    fireEvent.changeText(screen.getByTestId('review-title-input'), 'Harika');
    await submit();
    await waitFor(() =>
      expect(productMock).toHaveBeenCalledWith({
        productId: 'prod-1',
        orderId: 'order-1',
        score: 5,
        title: 'Harika',
        review: undefined,
      }),
    );
    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith('Değerlendirmeniz alındı. Onaylandıktan sonra yayınlanacak.'),
    );
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
  });

  it('sunucu hatası: toast.error, ekran kalır', async () => {
    productMock.mockRejectedValueOnce({ response: { data: { message: 'Zaten değerlendirdiniz' } } });
    await renderScreen();
    fireEvent.press(star(3));
    await submit();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Zaten değerlendirdiniz'));
    expect(backMock).not.toHaveBeenCalled();
  });
});

describe('J110 · Satıcıyı puanla + karakter limiti', () => {
  it('satıcı tipinde başlık, satıcı adı ve kriterler; başlık alanı yok', async () => {
    mockParams = { id: 'order-1', type: 'seller' };
    await renderScreen();
    expect(screen.getByText('Satıcıyı Değerlendir')).toBeOnTheScreen();
    expect(screen.getByText('Ahmet Satıcı')).toBeOnTheScreen();
    expect(screen.getByText('Değerlendirme Kriterleri:')).toBeOnTheScreen();
    expect(screen.getByText('• Ürün Doğruluğu (%40)')).toBeOnTheScreen();
    expect(screen.queryByTestId('review-title-input')).toBeNull();
  });

  it('satıcı puanı kullanıcı uç noktasına gider (yorum `comment`)', async () => {
    mockParams = { id: 'order-1', type: 'seller' };
    await renderScreen();
    fireEvent.press(star(4));
    fireEvent.changeText(screen.getByTestId('review-text-input'), 'Hızlı kargo');
    await submit();
    await waitFor(() =>
      expect(sellerMock).toHaveBeenCalledWith({
        receiverId: 's1',
        orderId: 'order-1',
        score: 4,
        comment: 'Hızlı kargo',
      }),
    );
    expect(productMock).not.toHaveBeenCalled();
  });

  it('ücretsiz üye: 500 karakter sayacı ve Premium notu; yorum alanı sınırlı', async () => {
    await renderScreen();
    expect(screen.getByText('0/500')).toBeOnTheScreen();
    expect(screen.getByText('Premium üyeler 2000 karakter yazabilir')).toBeOnTheScreen();
    expect(screen.getByTestId('review-text-input').props.maxLength).toBe(500);
    fireEvent.changeText(screen.getByTestId('review-text-input'), 'abc');
    expect(screen.getByText('3/500')).toBeOnTheScreen();
  });

  it('Premium üye: 2000 sınırı, not yok', async () => {
    mockLimits = { maxReviewChars: 2000 };
    await renderScreen();
    expect(screen.getByText('0/2000')).toBeOnTheScreen();
    expect(screen.queryByText('Premium üyeler 2000 karakter yazabilir')).toBeNull();
  });
});

it('kirli form: geri çıkış onay ister; temiz form serbest', async () => {
  await renderScreen();
  expect(emitBeforeRemove().prevented).toBe(false);
  fireEvent.press(star(2));
  expect(emitBeforeRemove().prevented).toBe(true);
});

it.each([
  ['product', { hasProductRating: true }],
  ['seller', { hasSellerRating: true }],
])('%s zaten puanlandıysa form yerine bilgi durumu (derin bağlantı / bayat liste)', async (type, flags) => {
  mockParams = { id: 'order-1', type };
  getMock.mockResolvedValue({
    data: {
      data: {
        id: 'order-1',
        status: 'delivered',
        product: { id: 'prod-1', title: 'Vintage Kamera' },
        seller: { id: 's1', displayName: 'Ahmet Satıcı' },
        ...flags,
      },
    },
  });
  renderWithProviders(<OrderReviewScreen />);
  expect(await screen.findByTestId('review-already-rated')).toBeOnTheScreen();
  expect(screen.getByText('Değerlendirmeniz alındı')).toBeOnTheScreen();
  expect(screen.queryByTestId('review-submit-button')).toBeNull();
});

it('diğer taraf puanlandıysa bu tarafın formu açılır', async () => {
  mockParams = { id: 'order-1', type: 'seller' };
  getMock.mockResolvedValue({
    data: { data: { id: 'order-1', product: { id: 'prod-1' }, seller: { id: 's1' }, hasProductRating: true } },
  });
  await renderScreen();
  expect(screen.queryByTestId('review-already-rated')).toBeNull();
});

it('bilinmeyen ?type ürün sayılır', async () => {
  mockParams = { id: 'order-1', type: 'xyz' };
  await renderScreen();
  expect(screen.getByText('Ürünü Değerlendir')).toBeOnTheScreen();
});
