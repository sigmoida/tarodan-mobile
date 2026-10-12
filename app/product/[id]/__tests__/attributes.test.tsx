/**
 * İlan detayında `attributes[]` (delta 19, C-3.6): genel özel gruplar (Nadirlik
 * vb.) "Teknik özellikler" bölümünde grup adı → değer olarak görünür; ölçek,
 * malzeme ve renk grupları burada tekrar edilmez.
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

describe('ProductInfo teknik özellikler', () => {
  it('genel özel grup değerini gösterir, ölçek/malzeme/renk satırlarını tekrar etmez', () => {
    renderInfo({
      attributes: [
        { id: '1', label: 'Nadirlik', value: 'Nadir', groupSlug: 'rarity' },
        { id: '2', label: 'Ölçek', value: '1:64', groupSlug: 'scale' },
        { id: '3', label: 'Renk', value: 'Mavi', groupSlug: 'color' },
      ],
    });

    expect(screen.getByText('Teknik özellikler')).toBeTruthy();
    expect(screen.getByText('Nadirlik')).toBeTruthy();
    expect(screen.getByText('Nadir')).toBeTruthy();
    expect(screen.queryByText('Mavi')).toBeNull();
    expect(screen.queryByText('1:64')).toBeNull();
  });

  it('gösterilecek nitelik yoksa bölüm hiç çizilmez', () => {
    renderInfo({ attributes: [{ id: '2', label: 'Ölçek', value: '1:64', groupSlug: 'scale' }] });
    expect(screen.queryByText('Teknik özellikler')).toBeNull();

    renderInfo();
    expect(screen.queryByText('Teknik özellikler')).toBeNull();
  });
});
