import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProductPrice } from '../ProductPrice';
import { formatPriceRange } from '@/utils/format';

describe('ProductPrice (web ProductCard fiyat kuralı)', () => {
  it('indirim yoksa yalnız güncel fiyatı "1.234,50 TL" biçiminde basar', () => {
    render(<ProductPrice product={{ price: 1234.5 }} />);
    expect(screen.getByTestId('product-price').props.children).toBe('1.234,50 TL');
    expect(screen.queryByTestId('product-price-old')).toBeNull();
  });

  it('oldPrice güncel fiyattan yüksekse eski fiyat üstü çizili basılır', () => {
    render(<ProductPrice product={{ price: 80, oldPrice: 100 }} />);
    expect(screen.getByTestId('product-price').props.children).toBe('80,00 TL');
    const old = screen.getByTestId('product-price-old');
    expect(old.props.children).toBe('100,00 TL');
    expect(JSON.stringify(old.props.style)).toContain('line-through');
  });

  it('originalPrice alanını da eski fiyat sayar; string fiyatlar sayıya çevrilir', () => {
    render(<ProductPrice product={{ price: '50', originalPrice: '75.5' }} />);
    expect(screen.getByTestId('product-price').props.children).toBe('50,00 TL');
    expect(screen.getByTestId('product-price-old').props.children).toBe('75,50 TL');
  });

  it('eski fiyat güncelden düşük/eşitse (hatalı veri) çizili fiyat basılmaz', () => {
    render(<ProductPrice product={{ price: 100, oldPrice: 100 }} />);
    expect(screen.queryByTestId('product-price-old')).toBeNull();
  });
});

describe('formatPriceRange', () => {
  it('alt/üst sınır biçimlenir; boş üst sınır ∞, boş alt sınır 0', () => {
    expect(formatPriceRange('100', '500')).toBe('100,00 TL - 500,00 TL');
    expect(formatPriceRange('', '500')).toBe('0,00 TL - 500,00 TL');
    expect(formatPriceRange('100', '')).toBe('100,00 TL - ∞');
  });
});
