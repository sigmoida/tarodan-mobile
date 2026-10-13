/**
 * İlan detayında ürün kodu (delta §3).
 *
 * `GET /products/:id` gövdesinde `productCode` gerçekten var (canlı
 * doğrulandı: `"U010000"`), ama repoda hiçbir yerde okunmuyordu. Kod destek
 * yazışmalarında ve satıcıyla iletişimde ürünü tanımlayan alan.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ProductSpecs } from '../_components/ProductSpecs';

const base = {
  id: 'p1',
  title: 'Model',
  price: 500,
  condition: 'very_good',
  images: [],
};

function renderInfo(extra: Record<string, unknown> = {}) {
  render(<ProductSpecs product={{ ...base, ...extra } as any} />);
}

describe('ProductSpecs product code', () => {
  it('shows the product code the server sends', () => {
    renderInfo({ productCode: 'U010000' });

    expect(screen.getByText('İlan No')).toBeTruthy();
    expect(screen.getByText('U010000')).toBeTruthy();
  });

  it('omits the row when the product has no code', () => {
    renderInfo();

    expect(screen.queryByText('İlan No')).toBeNull();
  });
});
