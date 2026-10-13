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

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ProductCard } from '../../components/product/ProductCard';

const base = { id: 'p1', title: 'Model', price: 100, images: [] };

const layouts = ['grid', 'list'] as const;

describe.each(layouts)('ProductCard (%s) trade badge', (layout) => {
  // Liste görünümünde telefonda rozet yalnız ikon (web `hidden sm:inline`): etiket erişilebilirlik adıyla aranır.
  const badge = () => screen.queryByLabelText(/takas/i) ?? screen.queryByText(/takas/i);
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
