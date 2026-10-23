/**
 * Stack screens with the bar (category, search, manufacturer / brand / model products): `withStackTabBar`
 * wraps the screen with the floating bottom bar. Route based: no tab highlight, when collapsed only the
 * "+" remains, a tap pops back to the `(tabs)` underneath with `router.dismissTo`. The bar is limited to
 * those screens (product detail and other stack screens do not get it).
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { withStackTabBar } from '../StackTabBar';
import { useTabBarCollapsed } from '../TabBarCollapse';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 2 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));
let mockFocused = true;
jest.mock('@/ui/lib/screenFocus', () => ({ useScreenFocused: () => mockFocused }));

const dismissTo = router.dismissTo as jest.Mock;

const collapsedRefs: Record<string, { value: boolean }> = {};
function makeScreen(id: string) {
  return function FakeScreen() {
    // Ekranın listesi (`useTabBarPageScroll`) aynı sağlayıcıya yazar: burada değeri doğrudan yakalarız.
    collapsedRefs[id] = useTabBarCollapsed();
    return <Text testID={`screen-${id}`}>{id}</Text>;
  };
}
const Listings = withStackTabBar(makeScreen('listings'));

const pill = () => screen.getByTestId('app-tab-pill', { includeHiddenElements: true });

describe('withStackTabBar — yığın ekranında yüzen alt menü', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    dismissTo.mockClear();
    mockFocused = true;
  });
  afterEach(() => jest.useRealTimers());

  it('ekran + menü birlikte çizilir; hiçbir sekme seçili değil, "+" görünür', () => {
    render(<Listings />);
    expect(screen.getByTestId('screen-listings')).toBeTruthy();
    expect(screen.getByTestId('app-tab-bar')).toBeTruthy();
    ['tab-home', 'tab-favorites', 'tab-cart', 'tab-profile'].forEach((id) =>
      expect(screen.getByTestId(id).props.accessibilityState).toEqual({ selected: false }),
    );
    expect(screen.getByTestId('tab-sell').props.accessibilityState).toEqual({ selected: false });
  });

  it('aşağı kaydırınca (daralma) hap gizlenir, yalnız "+" kalır — sekme dairesi YOK', async () => {
    render(<Listings />);
    act(() => {
      collapsedRefs.listings!.value = true;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(pill().props.pointerEvents).toBe('none'));
    expect(pill().props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId('tab-collapsed', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('tab-sell-wrap').props.pointerEvents).toBe('auto');
    expect(screen.getByTestId('tab-sell')).toBeTruthy();
  });

  it.each([
    ['tab-home', '/(tabs)'],
    ['tab-favorites', '/(tabs)/favorites'],
    ['tab-cart', '/(tabs)/cart'],
    ['tab-profile', '/(tabs)/profile'],
    ['tab-sell', '/(tabs)/sell'],
  ])('%s dokunuşu alttaki sekmelere döner: dismissTo(%s)', (testID, href) => {
    render(<Listings />);
    fireEvent.press(screen.getByTestId(testID));
    expect(dismissTo).toHaveBeenCalledTimes(1);
    expect(dismissTo).toHaveBeenCalledWith(href);
  });

  it('ekran yeniden odaklanınca (detaydan geri dönüş) menü açılır', () => {
    mockFocused = false;
    const view = render(<Listings />);
    act(() => {
      collapsedRefs.listings!.value = true;
    });
    mockFocused = true;
    view.rerender(<Listings />);
    expect(collapsedRefs.listings!.value).toBe(false);
  });

  it('her ekranın daralma sinyali kendine ait (sekme köklerini ve diğer menülü ekranı etkilemez)', () => {
    const Category = withStackTabBar(makeScreen('category'));
    render(
      <>
        <Listings />
        <Category />
      </>,
    );
    act(() => {
      collapsedRefs.listings!.value = true;
    });
    expect(collapsedRefs.category!.value).toBe(false);
  });
});

describe('the bar is limited to the product result stack screens', () => {
  const appDir = path.resolve(__dirname, '../../../../app');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(full);
      } else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk(appDir);
  const rel = (f: string) => path.relative(appDir, f).split(path.sep).join('/');

  it('withStackTabBar users: category, search, model detail (product detail etc. have none)', () => {
    const users = files.filter((f) => fs.readFileSync(f, 'utf8').includes('withStackTabBar(')).map(rel).sort();
    expect(users).toEqual(['category/[slug]/index.tsx', 'models/[slug]/index.tsx', 'search/index.tsx']);
  });

  it('manufacturer / brand routes get the bar through the shared EntityProductsScreen', () => {
    const shared = fs.readFileSync(path.resolve(__dirname, '../../catalog/EntityProductsScreen.tsx'), 'utf8');
    expect(shared).toContain('withStackTabBar(');
    for (const route of ['ureticiler/[slug].tsx', 'brands/[slug].tsx']) {
      expect([route, fs.readFileSync(path.join(appDir, route), 'utf8').includes('<EntityProductsScreen')]).toEqual([route, true]);
    }
  });

  it('AppTabBar yalnız sekme layout\'unda bağlı', () => {
    const users = files.filter((f) => /<AppTabBar\b/.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(users).toEqual(['(tabs)/_layout.tsx']);
  });
});
