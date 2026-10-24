/**
 * Stack screens with the bar (category, search, manufacturer / brand / model products): `withStackTabBar`
 * wraps the screen with the fixed bottom bar. Route based: no tab highlight, a tap pops back to the
 * `(tabs)` underneath with `router.dismissTo`, scrolling never changes the bar. The bar is limited to
 * those screens (product detail and other stack screens do not get it).
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { usePageScrollHandler } from '@/ui';
import { withStackTabBar } from '../StackTabBar';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 2 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));

const dismissTo = router.dismissTo as jest.Mock;

function makeScreen(id: string) {
  return function FakeScreen() {
    // A real list bound like the bar screens bind theirs (`usePageScrollHandler`).
    const page = usePageScrollHandler();
    return (
      <Animated.FlatList
        testID={`screen-${id}`}
        data={Array.from({ length: 40 }, (_, i) => String(i))}
        renderItem={({ item }) => <Text>{item}</Text>}
        {...page.listProps}
      />
    );
  };
}
const Listings = withStackTabBar(makeScreen('listings'));

/** Everything about the bar that a collapse used to change. */
const barSnapshot = () => {
  const bar = screen.getByTestId('app-tab-bar');
  const pill = screen.getByTestId('app-tab-pill');
  return {
    bar: StyleSheet.flatten(bar.props.style),
    pill: StyleSheet.flatten(pill.props.style),
    pointerEvents: pill.props.pointerEvents,
    hidden: pill.props.accessibilityElementsHidden,
    items: ['tab-home', 'tab-favorites', 'tab-sell', 'tab-cart', 'tab-profile'].map((id) => !!screen.queryByTestId(id)),
  };
};

describe('withStackTabBar — yığın ekranında sabit alt menü', () => {
  beforeEach(() => {
    dismissTo.mockClear();
  });

  it('ekran + menü birlikte çizilir; hiçbir sekme seçili değil, "+" görünür', () => {
    render(<Listings />);
    expect(screen.getByTestId('screen-listings')).toBeTruthy();
    expect(screen.getByTestId('app-tab-bar')).toBeTruthy();
    ['tab-home', 'tab-favorites', 'tab-cart', 'tab-profile'].forEach((id) =>
      expect(screen.getByTestId(id).props.accessibilityState).toEqual({ selected: false }),
    );
    expect(screen.getByTestId('tab-sell').props.accessibilityState).toEqual({ selected: false });
  });

  it('scrolling the list (down, far down, back up) never changes the bar', () => {
    render(<Listings />);
    const before = barSnapshot();
    expect(before.items).toEqual([true, true, true, true, true]);
    const list = screen.getByTestId('screen-listings');
    for (const y of [40, 400, 1200, 300, 0]) {
      fireEvent.scroll(list, {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { width: 390, height: 3000 },
          layoutMeasurement: { width: 390, height: 800 },
          contentInset: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      });
      expect(barSnapshot()).toEqual(before);
    }
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
