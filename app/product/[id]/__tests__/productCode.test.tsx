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

import { ProductInfo } from '../_components/ProductInfo';

const base = {
  id: 'p1',
  title: 'Model',
  price: 500,
  condition: 'very_good',
  images: [],
};

function renderInfo(extra: Record<string, unknown> = {}) {
  const noop = () => {};
  render(
    <ProductInfo
      product={{ ...base, ...extra } as any}
      isOwner={false}
      price={{ effectivePrice: 500, originalPrice: null, discountPct: 0 } as any}
      favoriteCount={0}
      actions={
        {
          onMakeOffer: noop,
          onTrade: noop,
          onAddToCollection: noop,
          onMessage: noop,
          onShare: noop,
        } as any
      }
      onOpenReviews={noop}
    />,
  );
}

describe('ProductInfo product code', () => {
  it('shows the product code the server sends', () => {
    renderInfo({ productCode: 'U010000' });

    expect(screen.getByText('Ürün Kodu')).toBeTruthy();
    expect(screen.getByText('U010000')).toBeTruthy();
  });

  it('omits the row when the product has no code', () => {
    renderInfo();

    expect(screen.queryByText('Ürün Kodu')).toBeNull();
  });
});
