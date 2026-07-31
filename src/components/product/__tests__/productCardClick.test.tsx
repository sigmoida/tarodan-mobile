import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { productsApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

// NOT: jest.mock fabrikası dış değişkene ancak adı `mock` ile başlıyorsa
// atıf yapabilir; aksi halde "not allowed to reference any out-of-scope
// variables" hatası alınır.
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockRouterPush(...a) } }));

const product = {
  id: 'p-1',
  title: 'Test Ürün',
  price: 100,
  images: [],
} as never;

describe('ProductCard tıklama takibi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('karta basınca tıklama kaydedilir', () => {
    const { getByText } = render(<ProductCard product={product} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(productsApi.recordClick).toHaveBeenCalledWith('p-1');
  });

  it('takip başarısız olsa bile navigasyon çalışır', () => {
    (productsApi.recordClick as jest.Mock).mockRejectedValueOnce(new Error('ağ'));
    const { getByText } = render(<ProductCard product={product} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(mockRouterPush).toHaveBeenCalledWith('/product/p-1');
  });

  it('onPress override edildiğinde de tıklama kaydedilir', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProductCard product={product} onPress={onPress} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(productsApi.recordClick).toHaveBeenCalledWith('p-1');
    expect(onPress).toHaveBeenCalled();
  });
});
