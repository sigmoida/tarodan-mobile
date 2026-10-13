import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AppTabBar } from '../AppTabBar';
import { TabBarCollapseProvider, useTabBarCollapsed } from '../TabBarCollapse';
import { theme } from '@/ui';
import { tabPillBottomOffset, TAB_PILL_HEIGHT } from '../tabBarLayout';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 3, favoriteCount: 0 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

const routes = ['index', 'sell', 'messages/index', 'profile', 'create', 'notifications/index'];

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
    const ids = ['tab-home', 'tab-sell', 'tab-messages', 'tab-profile'];
    ids.forEach((id) => expect(screen.getByTestId(id)).toBeTruthy());
    expect(screen.queryByLabelText('Ara')).toBeNull();
    expect(screen.queryByTestId('tab-favorites')).toBeNull();
    // "+" hapın DIŞINDA (ayrı düğme).
    expect(within(screen.getByTestId('app-tab-pill')).queryByTestId('tab-sell')).toBeNull();
    expect(within(screen.getByTestId('app-tab-pill')).getByTestId('tab-home')).toBeTruthy();
  });

  it('a11y: sekmeler role=tab + selected; "+" erişilebilir düğme', () => {
    setup(2);
    expect(screen.getByTestId('tab-messages').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-messages').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByTestId('tab-sell').props.accessibilityLabel).toBe('İlan ver');
  });

  it('aktif sekmenin arkasında gri vurgu var; pasifte yok', () => {
    setup(2);
    const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(flat('tab-messages').backgroundColor).toBe(theme.colors.gray[100]);
    expect(flat('tab-home').backgroundColor).toBeUndefined();
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
    fireEvent.press(screen.getByTestId('tab-messages'));
    expect(navigate).toHaveBeenCalledWith('messages/index');
    navigate.mockClear();
    fireEvent.press(screen.getByTestId('tab-home'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('mesaj sekmesi okunmamış sayısını rozetle gösterir', () => {
    setup();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('hap alt konumu en az 12pt; yükseklik sabiti', () => {
    expect(tabPillBottomOffset(0)).toBe(12);
    expect(tabPillBottomOffset(34)).toBe(26);
    expect(TAB_PILL_HEIGHT).toBe(64);
  });
});
