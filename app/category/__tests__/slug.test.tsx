/**
 * J12 · Kategori liste ekranı — mobil UI dilimi.
 * Başlık render, ürün kartları listesi + sonuç sayısı, boş/bulunamadı durumu,
 * ürün karta basınca router.push wiring, geri butonu.
 * Backend filtre/sıralama mantığı (sortBy server param) backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { slug: 'arabalar' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
import { router } from 'expo-router';

// Yüzen alt menü (withStackTabBar) sayaçları: sepet deposu (AsyncStorage) / sorgu bağlamı gerekmesin.
jest.mock('@/components/shell/useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));

jest.mock('@/lib/api', () => ({
  categoriesApi: { getBySlug: jest.fn() },
  productsApi: { getAll: jest.fn(), recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));
import { categoriesApi, productsApi } from '@/lib/api';

import CategoryScreen from '../[slug]';

const pushMock = router.push as jest.Mock;
const backMock = router.back as jest.Mock;
const getBySlug = categoriesApi.getBySlug as jest.Mock;
const getAll = productsApi.getAll as jest.Mock;

function productFixture(over: Record<string, unknown> = {}) {
  return {
    id: 'p1', title: 'Kırmızı Araba', price: 1200, brand: 'Hot Wheels',
    scale: '1:64', images: [], viewCount: 5, status: 'active', quantity: 1, ...over,
  };
}

describe('J12 · Kategori liste', () => {
  beforeEach(() => {
    getBySlug.mockReset();
    getAll.mockReset();
    pushMock.mockReset();
    backMock.mockReset();
    mockParams = { slug: 'arabalar' };
  });

  it('J12.1 kategori adı başlıkta ve ürünler listelenir', async () => {
    getBySlug.mockResolvedValue({ data: { category: { id: 'c1', name: 'Arabalar' } } });
    getAll.mockResolvedValue({ data: { data: [productFixture(), productFixture({ id: 'p2', title: 'Mavi Araba' })] } });
    renderWithProviders(<CategoryScreen />);

    await waitFor(() => expect(screen.getByText('Arabalar')).toBeOnTheScreen());
    expect(await screen.findByText('Kırmızı Araba')).toBeOnTheScreen();
    expect(screen.getByText('Mavi Araba')).toBeOnTheScreen();
    expect(screen.getByText('2 ürün bulundu')).toBeOnTheScreen();
    // Yüzen alt menü bu yığın ekranında da görünür (withStackTabBar).
    expect(screen.getByTestId('app-tab-bar')).toBeOnTheScreen();
  });

  it('J12.2 kategoride ürün yoksa tek boş durum metni gösterilir', async () => {
    getBySlug.mockResolvedValue({ data: { category: { id: 'c1', name: 'Arabalar' } } });
    getAll.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<CategoryScreen />);

    expect(await screen.findByText('Henüz ilan yok')).toBeOnTheScreen();
  });

  it('J12.3 ürün kartına basınca ürün detayına yönlendirir', async () => {
    getBySlug.mockResolvedValue({ data: { category: { id: 'c1', name: 'Arabalar' } } });
    getAll.mockResolvedValue({ data: { data: [productFixture()] } });
    renderWithProviders(<CategoryScreen />);

    fireEvent.press(await screen.findByText('Kırmızı Araba'));
    expect(pushMock).toHaveBeenCalledWith('/product/p1');
  });

  it('J12.4 geri butonu router.back çağırır', async () => {
    getBySlug.mockResolvedValue({ data: { category: { id: 'c1', name: 'Arabalar' } } });
    getAll.mockResolvedValue({ data: { data: [] } });
    (router.canGoBack as jest.Mock).mockReturnValue(true);
    renderWithProviders(<CategoryScreen />);
    await screen.findByText('Arabalar');

    fireEvent.press(screen.getByLabelText('Geri'));
    expect(backMock).toHaveBeenCalled();
  });
});
