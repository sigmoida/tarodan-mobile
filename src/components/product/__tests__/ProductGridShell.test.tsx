/**
 * ProductGrid ↔ kabuk (PageShell/AppShell) kaydırma kenarı: kabuk altındaysa liste otomatik bağlanır
 * (ekranlar değişmez), kabuk yoksa düz liste; klavye ve anahtar disiplini.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
// Kartlardaki favori kalbi (`useProductCardFavorites`) React Query ister: provider'lı render.
import { renderWithProviders as render } from '@/test-utils';
import { ShellScrollProvider, usePageScrollHandler, theme } from '@/ui';
import { ProductGrid } from '../ProductGrid';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const items = [
  { id: 'a', title: 'Ürün A', price: 10, images: [] },
  { id: 'b', title: 'Ürün B', price: 20, images: [] },
];

const setBound = jest.fn();

/** Kabuğun yaptığını taklit eder: bağlam = kabuğun kendi `usePageScrollHandler()` sinyali. */
function FakeShell({ children }: { children: React.ReactNode }) {
  const page = usePageScrollHandler();
  return <ShellScrollProvider value={{ page, setBound }}>{children}</ShellScrollProvider>;
}

describe('ProductGrid · kaydırma kenarı + klavye', () => {
  beforeEach(() => setBound.mockClear());

  it('kabuk altında: listeyi kabuğa bağlar (setBound true), kaldırılınca bırakır', () => {
    const view = render(
      <FakeShell>
        <ProductGrid testID="grid" items={items} />
      </FakeShell>,
    );
    expect(setBound).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(setBound).toHaveBeenLastCalledWith(false);
  });

  it('kabuk altında: iOS contentInset (bar yüksekliği) + onScroll bağlanır', () => {
    render(
      <FakeShell>
        <ProductGrid testID="grid" items={items} />
      </FakeShell>,
    );
    const list = screen.getByTestId('grid');
    expect(list.props.contentInset).toEqual({ top: expect.any(Number) });
    expect(list.props.contentInset.top).toBeGreaterThanOrEqual(theme.headerHeight);
    expect(list.props.onScroll).toBeDefined();
    expect(list.props.scrollEventThrottle).toBe(16);
  });

  it('kabuk yokken: düz liste (inset/onScroll yok), yine de çizer', () => {
    render(<ProductGrid testID="grid" items={items} />);
    const list = screen.getByTestId('grid');
    expect(list.props.contentInset).toBeUndefined();
    expect(screen.getByText('Ürün A')).toBeTruthy();
  });

  it('klavye: ilk dokunuş kartı yutmaz (handled) ve sürüklemede klavye kapanır', () => {
    render(<ProductGrid testID="grid" items={items} />);
    const list = screen.getByTestId('grid');
    expect(list.props.keyboardShouldPersistTaps).toBe('handled');
    expect(list.props.keyboardDismissMode).toBe('on-drag');
  });

  it('anahtar yalnız id: aynı id iki kez gelirse index ile ayrıştırılmaz (kararlı hücre)', () => {
    const { rerender } = render(<ProductGrid items={items} />);
    rerender(<ProductGrid items={[items[1]!, items[0]!]} />);
    expect(screen.getByText('Ürün A')).toBeTruthy();
    expect(screen.getByText('Ürün B')).toBeTruthy();
  });
});
