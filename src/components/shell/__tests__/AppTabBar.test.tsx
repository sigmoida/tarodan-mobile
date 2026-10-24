import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppTabBar, TAB_BAR_ORDER } from '../AppTabBar';
import { theme } from '@/ui';
import { tabBarRowWidth, tabPillBottomOffset, TAB_BAR_MAX_WIDTH, TAB_PILL_HEIGHT, TAB_PILL_SIDE_GAP } from '../tabBarLayout';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 4, notificationCount: 5, messageCount: 3 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

// Gerçek `Tabs` sırası: index, sell, favorites, cart, profile, create (gizli).
const routes = ['index', 'sell', 'favorites/index', 'cart/index', 'profile', 'create'];
const BAR_ORDER = ['tab-home', 'tab-favorites', 'tab-sell', 'tab-cart', 'tab-profile'];

function tree(activeIndex: number, navigate: jest.Mock) {
  const state = { index: activeIndex, routes: routes.map((name) => ({ key: name, name })) };
  return (
    <AppTabBar state={state as never} navigation={{ navigate } as never} descriptors={{} as never} insets={{ top: 0, right: 0, bottom: 0, left: 0 }} />
  );
}

function setup(activeIndex = 0) {
  const navigate = jest.fn();
  render(tree(activeIndex, navigate));
  return navigate;
}

describe('AppTabBar — fixed five-item bar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('five items in one pill: Home, Favorites, "+", Cart, Profile; the "+" is index 2 (centre)', () => {
    setup();
    const pill = screen.getByTestId('app-tab-pill');
    const order = within(pill)
      .getAllByRole('tab')
      .map((el) => el.props.testID);
    expect(order).toEqual(BAR_ORDER);
    expect(order.indexOf('tab-sell')).toBe(2);
    expect(TAB_BAR_ORDER).toEqual(['index', 'favorites/index', 'sell', 'cart/index', 'profile']);
    // No "Ara" tab; Messages / Notifications are top bar buttons, not tabs.
    expect(screen.queryByLabelText('Ara')).toBeNull();
    expect(screen.queryByTestId('tab-messages')).toBeNull();
    expect(screen.queryByTestId('tab-notifications')).toBeNull();
    // No separate "+" button and no collapsed state any more.
    expect(screen.queryByTestId('tab-sell-wrap')).toBeNull();
    expect(screen.queryByTestId('tab-collapsed')).toBeNull();
  });

  it('the "+" item carries its label from the catalog (tr "İlan Ver") and a filled primary circle', () => {
    setup();
    const sell = screen.getByTestId('tab-sell');
    expect(within(sell).getByText('İlan Ver')).toBeTruthy();
    expect(sell.props.accessibilityLabel).toBe('İlan Ver');
    expect(StyleSheet.flatten(screen.getByTestId('tab-sell-icon').props.style).backgroundColor).toBe(
      theme.colors.primary[600],
    );
    expect(screen.getByLabelText('Favoriler')).toBeTruthy();
    expect(screen.getByLabelText('Sepet')).toBeTruthy();
  });

  it('the "+" navigates to the sell route; on the sell tab it does not navigate again', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-sell'));
    expect(navigate).toHaveBeenCalledWith('sell');
    navigate.mockClear();
    const view = render(tree(1, navigate));
    fireEvent.press(within(view.getAllByTestId('app-tab-pill').at(-1)!).getByTestId('tab-sell'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('every item is at least 44 pt high', () => {
    setup();
    for (const id of BAR_ORDER) {
      const st = StyleSheet.flatten(screen.getByTestId(id).props.style);
      expect(Math.max(st.height ?? 0, st.minHeight ?? 0)).toBeGreaterThanOrEqual(44);
    }
  });

  it('sekme etiketi ölçekten bağımsız sabit rol (11pt, tek satır, sığmazsa küçülür)', () => {
    setup();
    const label = screen.getByText('Favoriler');
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      fontSize: theme.tabBarLabel.fontSize,
      lineHeight: theme.tabBarLabel.lineHeight,
    });
    expect(theme.tabBarLabel.fontSize).toBe(11);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
  });

  it('a11y: every item role=tab with a label and the selected state', () => {
    setup(2);
    expect(screen.getByTestId('tab-favorites').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-favorites').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('tab-sell').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-sell').props.accessibilityState).toEqual({ selected: false });
    for (const id of BAR_ORDER) expect(screen.getByTestId(id).props.accessibilityLabel).toBeTruthy();
  });

  it('aktif sekme vurgusu: hapın İÇİNDE tek kayan öğe (dokunma almaz); sekme düğmelerinde zemin yok', () => {
    const navigate = jest.fn();
    const view = render(tree(2, navigate));
    BAR_ORDER.forEach((id, i) =>
      fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { x: i * 80, y: 0, width: 80, height: 48 } } }),
    );
    const hl = screen.getByTestId('tab-highlight');
    expect(within(screen.getByTestId('app-tab-pill')).getByTestId('tab-highlight')).toBeTruthy();
    expect(hl.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(hl.props.style)).toMatchObject({
      position: 'absolute',
      backgroundColor: theme.colors.gray[100],
    });
    BAR_ORDER.forEach((id) =>
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor).toBeUndefined(),
    );
    // Sekme değişimi (Profil) ve "+" sayfası: ölçümlü vurgu sorunsuz yeniden hedeflenir, tek öğe kalır.
    view.rerender(tree(4, navigate));
    view.rerender(tree(1, navigate));
    expect(screen.getAllByTestId('tab-highlight')).toHaveLength(1);
  });

  it('sekmeye dokununca ilgili rotaya gider; aktif sekmeye dokunmak gezinmez', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-favorites'));
    expect(navigate).toHaveBeenCalledWith('favorites/index');
    navigate.mockClear();
    fireEvent.press(screen.getByTestId('tab-home'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Sepet sekmesine dokununca cart/index rotasına gider', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-cart'));
    expect(navigate).toHaveBeenCalledWith('cart/index');
  });

  it('Sepet sekmesi zaten aktifse gezinmez', () => {
    const navigate = setup(3);
    fireEvent.press(screen.getByTestId('tab-cart'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Sepet sekmesi aktifken seçili', () => {
    setup(3);
    expect(screen.getByTestId('tab-cart').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-favorites').props.accessibilityState).toEqual({ selected: false });
  });

  it('yalnız sepet sekmesi sayaç rozeti taşır (sepet adedi)', () => {
    setup();
    expect(within(screen.getByTestId('tab-cart')).getByText('4')).toBeTruthy();
    expect(within(screen.getByTestId('tab-favorites')).queryByText(/\d/)).toBeNull();
    expect(within(screen.getByTestId('tab-home')).queryByText(/\d/)).toBeNull();
    expect(within(screen.getByTestId('tab-profile')).queryByText(/\d/)).toBeNull();
  });

  it('hap alt konumu en az 12pt; yükseklik sabiti', () => {
    expect(tabPillBottomOffset(0, 'ios')).toBe(12);
    expect(tabPillBottomOffset(34, 'ios')).toBe(26);
    // Android: 3 düğmeli / hareket çubuğunun ÜSTÜNDE (üstüne binmez).
    // Android 3 düğmeli çubuk (≥40): çubuğun ÜSTÜNDE; hareket gezinmesi (<40): iOS gibi biner.
    expect(tabPillBottomOffset(48, 'android')).toBe(56);
    expect(tabPillBottomOffset(24, 'android')).toBe(16);
    expect(tabPillBottomOffset(0, 'android')).toBe(12);
    expect(TAB_PILL_HEIGHT).toBe(64);
  });
});

describe('AppTabBar on large screens', () => {
  const setWindow = (width: number, height: number) =>
    Dimensions.set({
      window: { width, height, scale: 2, fontScale: 2 },
      screen: { width, height, scale: 2, fontScale: 2 },
    });
  afterEach(() => setWindow(375, 667));

  it('tabBarRowWidth: window minus the side gaps on phones, capped on wide windows', () => {
    for (const w of [320, 375, 390, 430, 466]) expect(tabBarRowWidth(w)).toBe(w - 2 * TAB_PILL_SIDE_GAP);
    expect(tabBarRowWidth(626)).toBe(TAB_BAR_MAX_WIDTH);
    expect(tabBarRowWidth(1032)).toBe(TAB_BAR_MAX_WIDTH);
    expect(tabBarRowWidth(0)).toBe(0);
  });

  it.each([
    [390, TAB_PILL_SIDE_GAP],
    [820, (820 - TAB_BAR_MAX_WIDTH) / 2],
    [1032, (1032 - TAB_BAR_MAX_WIDTH) / 2],
  ])('window %d pt: the row is inset %d pt on both sides', (width, inset) => {
    setWindow(width, 1000);
    render(tree(0, jest.fn()));
    const style = StyleSheet.flatten(screen.getByTestId('app-tab-bar').props.style);
    expect(style.left).toBe(inset);
    expect(style.right).toBe(inset);
  });
});
