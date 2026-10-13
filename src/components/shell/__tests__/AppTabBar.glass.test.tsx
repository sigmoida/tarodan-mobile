/**
 * Alt menü cam dalı: iOS 26'da hap + "+" GlassSurface (GlassView) ile çizilir; "+" primary tint,
 * aktif sekme primary-50 vurgu; daralma davranışı (dokunma kapanır, "+" açık) fallback ile aynı.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { theme } from '@/ui';
import { AppTabBar } from '../AppTabBar';
import { TabBarCollapseProvider, useTabBarCollapsed } from '../TabBarCollapse';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('@/ui/lib/glass', () => {
  const { View: V } = require('react-native');
  const Glass = (props: Record<string, unknown>) => <V {...props} testID={props.testID ?? 'glass-view'} />;
  return { getGlassView: () => Glass, resetGlassCache: () => undefined };
});

const routes = ['index', 'sell', 'messages/index', 'notifications/index', 'profile', 'create'];
let collapsedRef: { value: boolean } | null = null;
function Capture() {
  collapsedRef = useTabBarCollapsed();
  return null;
}
const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style) as Record<string, any>;

function setup(activeIndex = 0) {
  const state = { index: activeIndex, routes: routes.map((name) => ({ key: name, name })) };
  render(
    <TabBarCollapseProvider>
      <Capture />
      <AppTabBar state={state as never} navigation={{ navigate: jest.fn() } as never} descriptors={{} as never} insets={{ top: 0, right: 0, bottom: 0, left: 0 }} />
    </TabBarCollapseProvider>,
  );
}

describe('AppTabBar — Liquid Glass', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('hap ve "+" cam yüzey: regular cam, "+" primary tint', () => {
    setup();
    const glasses = screen.getAllByTestId('glass-view');
    expect(glasses).toHaveLength(2);
    expect(glasses.every((g) => g.props.glassEffectStyle === 'regular')).toBe(true);
    expect(glasses.filter((g) => g.props.tintColor === theme.colors.primary[600])).toHaveLength(1);
  });

  it('aktif sekme vurgusu çok hafif primary-50 (koyu overlay.black10 değil); sekme düğmesinin kendisinde zemin yok', () => {
    setup(2);
    ['tab-home', 'tab-messages'].forEach((id, i) =>
      fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { x: i * 80, y: 0, width: 80, height: 48 } } }),
    );
    expect(flat('tab-highlight').backgroundColor).toBe(theme.colors.primary[50]);
    expect(flat('tab-messages').backgroundColor).toBeUndefined();
    expect(flat('tab-home').backgroundColor).toBeUndefined();
  });

  it('interaktif cam: yalnız "+" isInteractive; hap yüzeyi değil (içindeki sekme dokunuşları çakışmasın)', () => {
    setup();
    const glasses = screen.getAllByTestId('glass-view');
    const interactive = glasses.filter((g) => g.props.isInteractive === true);
    expect(interactive).toHaveLength(1);
    expect(interactive[0]!.props.tintColor).toBe(theme.colors.primary[600]);
  });

  it('daralınca hap dokunmaya kapanır, "+" açık kalır; geri açılınca döner', async () => {
    setup();
    const pill = () => screen.getByTestId('app-tab-pill', { includeHiddenElements: true });
    act(() => {
      collapsedRef!.value = true;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(pill().props.pointerEvents).toBe('none'));
    expect(screen.getByTestId('tab-sell')).toBeTruthy();
    act(() => {
      collapsedRef!.value = false;
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(pill().props.pointerEvents).toBe('auto'));
  });
});
