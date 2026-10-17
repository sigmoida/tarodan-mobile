/**
 * Modeller: marka başına SectionCard + model kartları; boş durum; model detayında tek ProductCard ızgarası.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
// Kartlardaki favori kalbi (`useProductCardFavorites`) React Query ister: provider'lı render.
import { renderWithProviders as render } from '@/test-utils';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const mockModels = jest.fn();
jest.mock('../_hooks/useModels', () => ({ useModels: () => mockModels() }));
const mockDetail = jest.fn();
jest.mock('../[slug]/_hooks/useModelDetail', () => ({ useModelDetail: () => mockDetail() }));

import ModelsScreen from '../index';
import ModelDetailScreen from '../[slug]/index';

const brand = { id: 'b1', name: 'Ferrari', slug: 'ferrari', country: 'İtalya' };
const modelsBase = {
  search: '',
  setSearch: jest.fn(),
  selectedBrand: 'all',
  setSelectedBrand: jest.fn(),
  isLoading: false,
  refreshing: false,
  onRefresh: jest.fn(),
  brands: [brand],
  grouped: [{ brand, models: [{ id: 'm1', name: 'F40', slug: 'f40', brand, yearStart: 1987, yearEnd: 1992, productCount: 3 }] }],
};

describe('modeller listesi', () => {
  it('marka başlığı, model kartı, yıllar ve ürün sayısı', () => {
    mockModels.mockReturnValue(modelsBase);
    render(<ModelsScreen />);
    expect(screen.getByTestId('models-brand-ferrari')).toBeTruthy();
    expect(screen.getByText('F40')).toBeTruthy();
    expect(screen.getByText('1987 - 1992')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('F40'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/models/[slug]', params: { slug: 'f40' } });
  });

  it('sonuç yoksa boş durum ama arama kutusu kalır', () => {
    mockModels.mockReturnValue({ ...modelsBase, grouped: [], search: 'x' });
    render(<ModelsScreen />);
    expect(screen.getByText('Model bulunamadı.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Model veya marka ara')).toBeTruthy();
  });
});

describe('model detayı', () => {
  const detailBase = () => ({
    modelQuery: { isLoading: false, isError: false },
    productsQuery: { isLoading: false },
    model: { id: 'm1', name: 'F40', slug: 'f40', brand, yearStart: 1987, description: 'Efsane' },
    products: [{ id: 'p1', title: 'F40 1:18', price: 250, images: [] }],
    refreshing: false,
    onRefresh: jest.fn(),
  });

  it('başlık, açıklama ve ürün kartı', () => {
    mockDetail.mockReturnValue(detailBase());
    render(<ModelDetailScreen />);
    expect(screen.getByText('Efsane')).toBeTruthy();
    expect(screen.getByText('F40 1:18')).toBeTruthy();
    expect(screen.getByTestId('product-card-price').props.children).toBe('250,00 TL');
  });

  it('model bulunamazsa (404) boş durum', () => {
    mockDetail.mockReturnValue({ ...detailBase(), model: null, notFound: true, modelLoadFailed: false });
    render(<ModelDetailScreen />);
    expect(screen.getByText('Modellere Dön')).toBeTruthy();
  });

  it('model yüklenemezse (ağ/5xx) bulunamadı değil ErrorState', () => {
    mockDetail.mockReturnValue({
      ...detailBase(),
      model: null,
      notFound: false,
      modelLoadFailed: true,
      modelQuery: { isLoading: false, isError: true, refetch: jest.fn() },
    });
    render(<ModelDetailScreen />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.queryByText('Modellere Dön')).toBeNull();
  });
});
