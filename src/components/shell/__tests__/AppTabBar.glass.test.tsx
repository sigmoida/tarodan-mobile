/**
 * Alt menü cam dalı: iOS 26'da hap tek GlassSurface (GlassView); "+" artık hapın içinde bir öğe (ayrı
 * cam daire yok). Aktif sekme nötr gri (gray-100) vurgu; hapın kenarlığı fallback'tekiyle aynı.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';
import { AppTabBar } from '../AppTabBar';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 0 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('@/ui/lib/glass', () => {
  const { View: V } = require('react-native');
  const Glass = (props: Record<string, unknown>) => <V {...props} glass testID={props.testID ?? 'glass-view'} />;
  return { getGlassView: () => Glass, resetGlassCache: () => undefined };
});

const routes = ['index', 'sell', 'favorites/index', 'cart/index', 'profile', 'create'];
const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style) as Record<string, any>;

function setup(activeIndex = 0) {
  const state = { index: activeIndex, routes: routes.map((name) => ({ key: name, name })) };
  render(
    <AppTabBar state={state as never} navigation={{ navigate: jest.fn() } as never} descriptors={{} as never} insets={{ top: 0, right: 0, bottom: 0, left: 0 }} />,
  );
}

describe('AppTabBar — Liquid Glass', () => {
  it('one glass surface (the pill): regular glass, no accent tint, not interactive; the "+" lives inside it', () => {
    setup();
    // Host views only (the mock renders a native View per glass surface).
    const hosts = screen.UNSAFE_root.findAll(
      (n: { type: unknown; props: { glass?: boolean } }) => typeof n.type === 'string' && n.props.glass === true,
    );
    expect(hosts).toHaveLength(1);
    const pill = screen.getByTestId('app-tab-pill');
    expect(pill.props.glassEffectStyle).toBe('regular');
    expect(pill.props.tintColor).not.toBe(theme.colors.primary[600]);
    expect(pill.props.isInteractive).toBeFalsy();
    expect(screen.getByTestId('tab-sell')).toBeTruthy();
  });

  it('aktif sekme vurgusu nötr gray-100 (turuncu değil); sekme düğmesinin kendisinde zemin yok', () => {
    setup(2);
    ['tab-home', 'tab-favorites'].forEach((id, i) =>
      fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { x: i * 80, y: 0, width: 80, height: 48 } } }),
    );
    expect(flat('tab-highlight').backgroundColor).toBe(theme.colors.gray[100]);
    expect(flat('tab-favorites').backgroundColor).toBeUndefined();
    expect(flat('tab-home').backgroundColor).toBeUndefined();
  });
});
