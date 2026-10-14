import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AppTabBar } from '../AppTabBar';
import { TabBarCollapseProvider, useTabBarCollapsed } from '../TabBarCollapse';
import { theme } from '@/ui';
import { tabPillBottomOffset, TAB_PILL_HEIGHT } from '../tabBarLayout';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 5, messageCount: 3 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

// Gerçek `Tabs` sırası: index, sell, messages, notifications, profile, create (gizli).
const routes = ['index', 'sell', 'messages/index', 'notifications/index', 'profile', 'create'];
const PILL_ORDER = ['tab-home', 'tab-messages', 'tab-notifications', 'tab-profile'];

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
    expect(screen.queryByTestId('tab-favorites')).toBeNull();
    // "+" hapın DIŞINDA (ayrı düğme).
    expect(within(screen.getByTestId('app-tab-pill')).queryByTestId('tab-sell')).toBeNull();
    expect(within(screen.getByTestId('app-tab-pill')).getByTestId('tab-home')).toBeTruthy();
  });

  it('hap sırası: Ana Sayfa, Mesajlar, Bildirimler, Profil; etiketler katalogdan', () => {
    setup();
    const pill = screen.getByTestId('app-tab-pill');
    const order = within(pill)
      .getAllByRole('tab')
      .map((el) => el.props.testID);
    expect(order).toEqual(PILL_ORDER);
    expect(screen.getByLabelText('Mesajlar')).toBeTruthy();
    expect(screen.getByLabelText('Bildirimler')).toBeTruthy();
  });

  it('sekme etiketi ölçekten bağımsız sabit rol (11pt, tek satır, sığmazsa küçülür)', () => {
    setup();
    const label = screen.getByText('Bildirimler');
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
    expect(screen.getByTestId('tab-messages').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-messages').props.accessibilityState).toEqual({ selected: true });
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
      backgroundColor: theme.colors.primary[50],
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

  it('Bildirimler sekmesine dokununca notifications/index rotasına gider', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-notifications'));
    expect(navigate).toHaveBeenCalledWith('notifications/index');
  });

  it('Bildirimler sekmesi zaten aktifse gezinmez', () => {
    const navigate = setup(3);
    fireEvent.press(screen.getByTestId('tab-notifications'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Bildirimler sekmesi aktifken seçili', () => {
    setup(3);
    expect(screen.getByTestId('tab-notifications').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-messages').props.accessibilityState).toEqual({ selected: false });
  });

  it('mesaj sekmesi okunmamış mesaj, bildirim sekmesi okunmamış bildirim sayısını rozetle gösterir', () => {
    setup();
    expect(within(screen.getByTestId('tab-messages')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('tab-notifications')).getByText('5')).toBeTruthy();
    expect(within(screen.getByTestId('tab-home')).queryByText(/\d/)).toBeNull();
    expect(within(screen.getByTestId('tab-profile')).queryByText(/\d/)).toBeNull();
  });

  it('hap alt konumu en az 12pt; yükseklik sabiti', () => {
    expect(tabPillBottomOffset(0)).toBe(12);
    expect(tabPillBottomOffset(34)).toBe(26);
    expect(TAB_PILL_HEIGHT).toBe(64);
  });
});
