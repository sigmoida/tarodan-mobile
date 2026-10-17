/**
 * İlanlarım kartında indirimli fiyat — web `ListingCard` paritesi: güncel fiyat
 * (`price`), indirimdeyse eski fiyat üstü çizili + "İndirim" rozeti. Kural
 * `@/utils/productPrice`, biçim `formatPrice` (₺ değil "TL").
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { MyListingCard } from '../my-listings/_components/MyListingsSections';
import type { Listing } from '../my-listings/_lib/types';

const listing = (over: Record<string, unknown> = {}) =>
  ({
    id: 'L1',
    title: 'Test İlanı',
    price: 400,
    status: 'active',
    viewCount: 0,
    likeCount: 0,
    images: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    condition: 'good',
    ...over,
  }) as unknown as Listing;

const noop = jest.fn();

describe('İlanlarım — indirimli fiyat', () => {
  it('indirimdeyse eski fiyat üstü çizili ve İndirim rozeti', () => {
    render(<MyListingCard listing={listing({ originalPrice: '500.00', isOnSale: true })} onMenu={noop} />);
    expect(screen.getByTestId('listing-price-L1')).toHaveTextContent('400,00 TL');
    const old = screen.getByTestId('listing-old-price-L1');
    expect(old).toHaveTextContent('500,00 TL');
    expect(StyleSheet.flatten(old.props.style).textDecorationLine).toBe('line-through');
    expect(screen.getByText('İndirim')).toBeTruthy();
    expect(screen.queryByText(/₺/)).toBeNull();
  });

  it('indirim yoksa yalnız güncel fiyat', () => {
    render(<MyListingCard listing={listing({ originalPrice: null })} onMenu={noop} />);
    expect(screen.getByTestId('listing-price-L1')).toHaveTextContent('400,00 TL');
    expect(screen.queryByTestId('listing-old-price-L1')).toBeNull();
    expect(screen.queryByText('İndirim')).toBeNull();
  });

  it('eski fiyat güncelden büyük değilse indirim gösterilmez', () => {
    render(<MyListingCard listing={listing({ oldPrice: 400 })} onMenu={noop} />);
    expect(screen.queryByTestId('listing-old-price-L1')).toBeNull();
  });
});
