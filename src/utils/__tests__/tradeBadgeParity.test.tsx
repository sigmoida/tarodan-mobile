/**
 * "Takas" rozeti — tek ProductCard'ın `isProductTradeOpen` tek kaynağını kullandığının regresyon testi.
 *
 * `isProductTradeOpen` tek kaynak (4 üst düzey alan + `trade.*` + `tradeStatus`,
 * ve `"false"` string'ini doğru şekilde YANLIŞ sayan coercion) ama rozeti basan
 * dört kart bileşeni de kendi inline kuralını yazıyordu: aynı ürün ana sayfada
 * rozetli, aramada rozetsiz görünüyordu ve API `"false"` string'i dönerse üçü de
 * rozeti basıyordu. Delta §4: rozet `tradeAvailable`'a bağlanır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ProductCard } from '../../components/product/ProductCard';

const base = { id: 'p1', title: 'Model', price: 100, images: [] };

const layouts = ['grid', 'list'] as const;

describe.each(layouts)('ProductCard (%s) trade badge', (layout) => {
  // Liste görünümünde telefonda rozet yalnız ikon (web `hidden sm:inline`): etiket erişilebilirlik adıyla aranır.
  // Kart etiketi de rozet adını içerir (erişilebilirlik) — birden çok eşleşme olabilir.
  const badge = () => screen.queryAllByLabelText(/takas/i)[0] ?? screen.queryByText(/takas/i);
  const renderCard = (item: any) => render(<ProductCard product={item} layout={layout} />);

  it('shows the badge when only tradeAvailable is set', () => {
    renderCard({ ...base, tradeAvailable: true });
    expect(badge()).toBeTruthy();
  });

  it('shows the badge when only tradeStatus is open', () => {
    renderCard({ ...base, tradeStatus: 'open' });
    expect(badge()).toBeTruthy();
  });

  it('shows the badge when only trade.available is set', () => {
    renderCard({ ...base, trade: { available: true } });
    expect(badge()).toBeTruthy();
  });

  it('hides the badge when the server sends the string "false"', () => {
    renderCard({ ...base, isTradeEnabled: 'false', tradeAvailable: 'false' });
    expect(badge()).toBeNull();
  });

  it('hides the badge when no trade signal is present', () => {
    renderCard({ ...base });
    expect(badge()).toBeNull();
  });
});

describe.each(layouts)('ProductCard (%s) trade badge - satın alınabilirlik', (layout) => {
  const badge = () => screen.queryAllByLabelText(/takas/i)[0] ?? screen.queryByText(/takas/i);
  // An active, in-stock listing also gets the card's cart action, which needs the query client.
  const renderCard = (item: Record<string, unknown>) =>
    renderWithProviders(<ProductCard product={item as never} layout={layout} />);

  it('hides the badge on sold / reserved / zero-stock listings', () => {
    for (const extra of [{ status: 'sold' }, { status: 'reserved' }, { availableQuantity: 0 }]) {
      const { unmount } = renderCard({ ...base, tradeAvailable: true, ...extra });
      expect(badge()).toBeNull();
      unmount();
    }
  });

  it('shows the badge on an active in-stock listing', () => {
    renderCard({ ...base, tradeAvailable: true, status: 'active', availableQuantity: 3 });
    expect(badge()).toBeTruthy();
  });
});
