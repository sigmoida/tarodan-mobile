/**
 * SearchResultCard fiyat türetmesi `@/utils/productPrice` ile tek kaynak:
 * `oldPrice ?? originalPrice` (web sırası), güncel fiyat `price`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import { SearchResultCard } from '../_components/SearchResultCard';

const base = { id: 'p1', title: 'Model', images: [] };
const renderCard = (item: object) =>
  render(<SearchResultCard item={{ ...base, ...item }} cartProductIds={new Set<string>()} onPress={() => {}} />);

describe('SearchResultCard fiyat', () => {
  it('indirimde eski fiyat çizili + yüzde; biçim 1.234,50 TL', () => {
    renderCard({ price: 750, oldPrice: 1000 });
    expect(screen.getByText('750,00 TL')).toBeTruthy();
    expect(screen.getByText('1.000,00 TL')).toBeTruthy();
    expect(screen.getByText('%25')).toBeTruthy();
  });

  it('oldPrice ve originalPrice birlikte gelirse web sırası: oldPrice kazanır', () => {
    renderCard({ price: 80, oldPrice: 100, originalPrice: 200 });
    expect(screen.getByText('100,00 TL')).toBeTruthy();
    expect(screen.queryByText('200,00 TL')).toBeNull();
  });

  it('eski fiyat güncelden yüksek değilse indirim gösterilmez', () => {
    renderCard({ price: 100, oldPrice: 100 });
    expect(screen.getByText('100,00 TL')).toBeTruthy();
    expect(screen.queryByText(/^%/)).toBeNull();
  });
});
