import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AppTabBar } from '../AppTabBar';
import { TabBarCollapseProvider, useTabBarCollapsed } from '../TabBarCollapse';
import { theme } from '@/ui';
import { tabBarRowWidth, tabPillBottomOffset, TAB_BAR_MAX_WIDTH, TAB_PILL_HEIGHT, TAB_PILL_SIDE_GAP } from '../tabBarLayout';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 4, notificationCount: 5, messageCount: 3 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

// Gerçek `Tabs` sırası: index, sell, favorites, cart, profile, create (gizli).
const routes = ['index', 'sell', 'favorites/index', 'cart/index', 'profile', 'create'];
const PILL_ORDER = ['tab-home', 'tab-favorites', 'tab-cart', 'tab-profile'];

let collapsedRef: { value: boolean } | null = null;
function CaptureCollapsed() {
  collapsedRef = useTabBarCollapsed();
  return null;
}

function tree(activeIndex: number, navigate: jest.Mock) {
  const state = { index: activeIndex, routes: routes.map((name) => ({ key: name, name })) };
  return (
    <TabBarCollapseProvider>
      <CaptureCollapsed />
      <AppTabBar state={state as never} navigation={{ navigate } as never} descriptors={{} as never} insets={{ top: 0, right: 0, bottom: 0, left: 0 }} />
    </TabBarCollapseProvider>
  );
}

function setup(activeIndex = 0) {
  const navigate = jest.fn();
  render(tree(activeIndex, navigate));
  return navigate;
}

describe('AppTabBar — yüzen hap', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('4 sekmeli hap + AYRI "+" düğmesi — "Ara" sekmesi yok', () => {
    setup();
    [...PILL_ORDER, 'tab-sell'].forEach((id) => expect(screen.getByTestId(id)).toBeTruthy());
    expect(screen.queryByLabelText('Ara')).toBeNull();
    // Mesajlar / Bildirimler artık sekme değil (üst bar düğmeleri).
    expect(screen.queryByTestId('tab-messages')).toBeNull();
    expect(screen.queryByTestId('tab-notifications')).toBeNull();
    // "+" hapın DIŞINDA (ayrı düğme).
    expect(within(screen.getByTestId('app-tab-pill')).queryByTestId('tab-sell')).toBeNull();
    expect(within(screen.getByTestId('app-tab-pill')).getByTestId('tab-home')).toBeTruthy();
  });

  it('hap sırası: Ana Sayfa, Favoriler, Sepet, Profil; etiketler katalogdan', () => {
    setup();
    const pill = screen.getByTestId('app-tab-pill');
    const order = within(pill)
      .getAllByRole('tab')
      .map((el) => el.props.testID);
    expect(order).toEqual(PILL_ORDER);
    expect(screen.getByLabelText('Favoriler')).toBeTruthy();
    expect(screen.getByLabelText('Sepet')).toBeTruthy();
    expect(screen.queryByLabelText('Mesajlar')).toBeNull();
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

  it('a11y: sekmeler role=tab + selected; "+" erişilebilir düğme', () => {
    setup(2);
    expect(screen.getByTestId('tab-favorites').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-favorites').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('tab-sell').props.accessibilityLabel).toBe('İlan ver');
  });

  it('aktif sekme vurgusu: hapın İÇİNDE tek kayan öğe (dokunma almaz); sekme düğmelerinde zemin yok', () => {
    const navigate = jest.fn();
    const view = render(tree(2, navigate));
    PILL_ORDER.forEach((id, i) =>
      fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { x: i * 80, y: 0, width: 80, height: 48 } } }),
    );
    const hl = screen.getByTestId('tab-highlight');
    expect(within(screen.getByTestId('app-tab-pill')).getByTestId('tab-highlight')).toBeTruthy();
    expect(hl.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(hl.props.style)).toMatchObject({
      position: 'absolute',
      backgroundColor: theme.colors.gray[100],
    });
    PILL_ORDER.forEach((id) =>
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor).toBeUndefined(),
    );
    // Sekme değişimi (Profil) ve "+" sayfası: ölçümlü vurgu sorunsuz yeniden hedeflenir, tek öğe kalır.
    view.rerender(tree(4, navigate));
    view.rerender(tree(1, navigate));
    expect(screen.getAllByTestId('tab-highlight')).toHaveLength(1);
  });

  it('daralınca hap dokunmaya + ekran okuyucuya kapanır, "+" açık kalır; geri açılınca döner', async () => {
    setup();
    const pill = () => screen.getByTestId('app-tab-pill', { includeHiddenElements: true });
    expect(pill().props.pointerEvents).toBe('auto');
    act(() => {
      collapsedRef!.value = true;
      jest.advanceTimersByTime(100);
    });
    await waitFor(() => expect(pill().props.pointerEvents).toBe('none'));
    expect(pill().props.accessibilityElementsHidden).toBe(true);
    expect(pill().props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.getByTestId('tab-sell')).toBeTruthy();
    act(() => {
      collapsedRef!.value = false;
      jest.advanceTimersByTime(100);
    });
    await waitFor(() => expect(pill().props.pointerEvents).toBe('auto'));
    expect(pill().props.accessibilityElementsHidden).toBe(false);
  });

  it('Ana Sayfa ve "+" sayfasında daralınca yalnız "+" kalır: sekme dairesi YOK', async () => {
    for (const index of [0, 1]) {
      const view = render(tree(index, jest.fn()));
      act(() => {
        collapsedRef!.value = true;
        jest.advanceTimersByTime(300);
      });
      await waitFor(() =>
        expect(screen.getByTestId('app-tab-pill', { includeHiddenElements: true }).props.pointerEvents).toBe('none'),
      );
      expect(screen.queryByTestId('tab-collapsed', { includeHiddenElements: true })).toBeNull();
      expect(screen.getByTestId('tab-sell-wrap').props.pointerEvents).toBe('auto');
      expect(screen.getByTestId('tab-sell')).toBeTruthy();
      view.unmount();
    }
  });

  describe('Favoriler / Sepet / Profil — daralınca o sekmenin dairesi kalır', () => {
    const collapse = async () => {
      act(() => {
        collapsedRef!.value = true;
        jest.advanceTimersByTime(300);
      });
      await waitFor(() => expect(screen.getByTestId('tab-collapsed-wrap').props.pointerEvents).toBe('auto'));
    };

    it.each([
      [2, 'Favoriler', null],
      [3, 'Sepet', '4'],
      [4, 'Profil', null],
    ])('sekme %i: daire etiketi "%s", rozet korunur, "+" gizli + ekran okuyucu dışı', async (index, label, badge) => {
      setup(index);
      // Açıkken daire dokunma + ekran okuyucu dışı.
      const wrap = () => screen.getByTestId('tab-collapsed-wrap', { includeHiddenElements: true });
      expect(wrap().props.pointerEvents).toBe('none');
      expect(wrap().props.accessibilityElementsHidden).toBe(true);
      expect(wrap().props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.getByTestId('tab-sell')).toBeTruthy();

      await collapse();
      const btn = screen.getByTestId('tab-collapsed');
      expect(btn.props.accessibilityLabel).toBe(label);
      expect(btn.props.accessibilityRole).toBe('tab');
      expect(btn.props.accessibilityState).toEqual({ selected: true });
      expect(wrap().props.accessibilityElementsHidden).toBe(false);
      if (badge) expect(within(btn).getByText(badge)).toBeTruthy();
      else expect(within(btn).queryByText(/\d/)).toBeNull();
      // "+" o sırada gizli: dokunma + ekran okuyucu dışı.
      const sellWrap = screen.getByTestId('tab-sell-wrap', { includeHiddenElements: true });
      expect(sellWrap.props.pointerEvents).toBe('none');
      expect(sellWrap.props.accessibilityElementsHidden).toBe(true);
      expect(sellWrap.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.queryByTestId('tab-sell')).toBeNull();
    });

    it('daireye dokununca hap yeniden açılır (gezinme yok), "+" geri gelir', async () => {
      const navigate = setup(2);
      await collapse();
      fireEvent.press(screen.getByTestId('tab-collapsed'));
      expect(collapsedRef!.value).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.getByTestId('app-tab-pill', { includeHiddenElements: true }).props.pointerEvents).toBe('auto'),
      );
      expect(screen.getByTestId('tab-sell-wrap').props.pointerEvents).toBe('auto');
      expect(screen.getByTestId('tab-collapsed-wrap', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
    });

    it('Favoriler\'de daralıp Ana Sayfa\'ya geçince: menü açık, daire kalkar, "+" erişilebilir', async () => {
      const navigate = jest.fn();
      const view = render(tree(2, navigate));
      await collapse();
      view.rerender(tree(0, navigate));
      expect(collapsedRef!.value).toBe(false);
      expect(screen.queryByTestId('tab-collapsed', { includeHiddenElements: true })).toBeNull();
      await waitFor(() => expect(screen.getByTestId('tab-sell-wrap').props.pointerEvents).toBe('auto'));
      expect(screen.getByTestId('tab-sell')).toBeTruthy();
    });

    it('Favoriler\'den Profil\'e geçince daire Profil sekmesini gösterir', () => {
      const navigate = jest.fn();
      const view = render(tree(2, navigate));
      view.rerender(tree(4, navigate));
      expect(screen.getByTestId('tab-collapsed', { includeHiddenElements: true }).props.accessibilityLabel).toBe('Profil');
    });
  });

  it('sekme değişince menü açık hale döner', () => {
    const navigate = jest.fn();
    const { rerender } = render(tree(0, navigate));
    act(() => {
      collapsedRef!.value = true;
    });
    expect(collapsedRef!.value).toBe(true);
    rerender(tree(2, navigate));
    expect(collapsedRef!.value).toBe(false);
  });

  it('"+" rota "sell"e gider; sell zaten aktifse gezinmez', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-sell'));
    expect(navigate).toHaveBeenCalledWith('sell');
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
