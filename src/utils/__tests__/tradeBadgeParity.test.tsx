/**
 * "Takas" rozeti — dört kartın tek kaynağı kullandığının regresyon testi.
 *
 * `isProductTradeOpen` tek kaynak (4 üst düzey alan + `trade.*` + `tradeStatus`,
 * ve `"false"` string'ini doğru şekilde YANLIŞ sayan coercion) ama rozeti basan
 * dört kart bileşeni de kendi inline kuralını yazıyordu: aynı ürün ana sayfada
 * rozetli, aramada rozetsiz görünüyordu ve API `"false"` string'i dönerse üçü de
 * rozeti basıyordu. Delta §4: rozet `tradeAvailable`'a bağlanır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ProductCard as HomeProductCard } from '../../../app/(tabs)/_components/ProductCard';
import { SearchResultCard } from '../../../app/(tabs)/_components/SearchResultCard';
import { ListingCard } from '../../../app/listings/_components/ListingCard';
import { ProductCard as SharedProductCard } from '../../components/product/ProductCard';

const base = { id: 'p1', title: 'Model', price: 100, images: [] };

const cards: Array<{ name: string; render: (item: any) => void }> = [
  {
    name: '(tabs)/ProductCard',
    render: (item) => render(<HomeProductCard item={item} index={0} inCart={false} onPress={() => {}} />),
  },
  {
    name: '(tabs)/SearchResultCard',
    render: (item) =>
      render(<SearchResultCard item={item} cartProductIds={new Set<string>()} onPress={() => {}} />),
  },
  {
    name: 'listings/ListingCard',
    render: (item) => render(<ListingCard item={item} />),
  },
  {
    name: 'components/product/ProductCard',
    render: (item) => render(<SharedProductCard product={item} />),
  },
];

describe.each(cards)('$name trade badge', ({ render: renderCard }) => {
  it('shows the badge when only tradeAvailable is set', () => {
    renderCard({ ...base, tradeAvailable: true });
    expect(screen.getByText(/takas/i)).toBeTruthy();
  });

  it('shows the badge when only tradeStatus is open', () => {
    renderCard({ ...base, tradeStatus: 'open' });
    expect(screen.getByText(/takas/i)).toBeTruthy();
  });

  it('shows the badge when only trade.available is set', () => {
    renderCard({ ...base, trade: { available: true } });
    expect(screen.getByText(/takas/i)).toBeTruthy();
  });

  it('hides the badge when the server sends the string "false"', () => {
    renderCard({ ...base, isTradeEnabled: 'false', tradeAvailable: 'false' });
    expect(screen.queryByText(/takas/i)).toBeNull();
  });

  it('hides the badge when no trade signal is present', () => {
    renderCard({ ...base });
    expect(screen.queryByText(/takas/i)).toBeNull();
  });
});
