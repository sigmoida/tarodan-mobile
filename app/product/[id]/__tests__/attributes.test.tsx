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
    // Ölçek/renk kendi satırında BİR kez görünür, teknik listede tekrar etmez.
    expect(screen.getAllByText('Mavi')).toHaveLength(1);
    expect(screen.getAllByText('1:64')).toHaveLength(1);
    expect(screen.queryByText('Ölçek')).toBeTruthy();
    expect(screen.getAllByText('Renk')).toHaveLength(1);
  });

  it('malzeme ve renk web gibi görünür: malzeme Detaylar, renk Teknik özellikler kartında', () => {
    renderInfo({ material: 'Diecast', color: 'Mavi, Kırmızı' });

    expect(screen.getByText('Malzeme')).toBeTruthy();
    expect(screen.getByText('Diecast')).toBeTruthy();
    expect(screen.getByText('Teknik özellikler')).toBeTruthy();
    expect(screen.getByText('Renk')).toBeTruthy();
    expect(screen.getByText('Mavi, Kırmızı')).toBeTruthy();
  });

  it('products.color/material boşsa nitelik gruplarından türetir (renkler virgülle)', () => {
    renderInfo({
      attributes: [
        { id: '1', label: 'Renk', value: 'Mavi', groupSlug: 'color' },
        { id: '2', label: 'Renk', value: 'Kırmızı', groupSlug: 'color' },
        { id: '3', label: 'Malzeme', value: 'Plastik', groupSlug: 'material' },
      ],
    });

    expect(screen.getByText('Mavi, Kırmızı')).toBeTruthy();
    expect(screen.getByText('Plastik')).toBeTruthy();
    expect(screen.getByText('Teknik özellikler')).toBeTruthy();
  });

  it('gösterilecek nitelik ve renk yoksa bölüm hiç çizilmez', () => {
    renderInfo({ attributes: [{ id: '2', label: 'Ölçek', value: '1:64', groupSlug: 'scale' }] });
    expect(screen.queryByText('Teknik özellikler')).toBeNull();

    renderInfo();
    expect(screen.queryByText('Teknik özellikler')).toBeNull();
  });
});
