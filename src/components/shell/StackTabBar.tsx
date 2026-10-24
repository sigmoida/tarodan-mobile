import React, { type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { TabBarView, type TabBarRoute } from './AppTabBar';

/** Tab route -> that tab of the `(tabs)` group in the root stack. */
export const TAB_BAR_HREF: Record<TabBarRoute, Href> = {
  index: '/(tabs)',
  sell: '/(tabs)/sell',
  'favorites/index': '/(tabs)/favorites',
  'cart/index': '/(tabs)/cart',
  profile: '/(tabs)/profile',
};

/**
 * Bottom bar of a non-tab stack screen (route based; no `Tabs` context). Same look as `AppTabBar`
 * (`TabBarView`), but no tab is highlighted while a stack screen is focused. A tap calls `router.dismissTo`: it pops back to the `(tabs)` group underneath in
 * the root stack and switches to that tab (no second `(tabs)` instance is pushed; `navigate` would
 * not pop to a route of the same name, it would push on top). If `(tabs)` is not in the stack (deep
 * link) it replaces the current screen. The keyboard hides the bar inside `TabBarView`.
 */
export function StackTabBar() {
  return <TabBarView onNavigate={(name) => router.dismissTo(TAB_BAR_HREF[name])} />;
}

/**
 * Wraps a stack screen with the fixed bottom bar (category, search, manufacturer / brand / model
 * product screens), drawn above the screen. The bar is PART of the screen, so it slides with it on
 * stack transitions (push, back, iOS swipe back) and never shows on other stack screens. The screen
 * adds `useTabBarInset()` to its bottom padding.
 */
export function withStackTabBar<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function ScreenWithTabBar(props: P) {
    return (
      <View style={styles.fill}>
        <Screen {...props} />
        <StackTabBar />
      </View>
    );
  }
  ScreenWithTabBar.displayName = `withStackTabBar(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return ScreenWithTabBar;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
