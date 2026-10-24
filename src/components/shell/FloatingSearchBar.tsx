import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { GLASS_ICON_BUTTON_SIZE, ScrollEdge, tabletSidePadding, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { ShellHeaderActions, ShellLeadingButton } from './ShellHeaderActions';
import { useLockedPush } from './useLockedPush';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';

const { spacing } = theme;

/**
 * Ana sayfanın yüzen üst barı: solda kategoriler düğmesi (`ShellLeadingButton`), ortada arama alanı, sağda Mesajlar + Bildirimler
 * (sayaçlı; `ShellHeaderActions`). Düğmeler `GlassIconButton` (cam daire). Bar zeminsizdir; altında
 * diğer tüm üst barlarla AYNI kaydırma kenarı (`ScrollEdge`, `scrollY`'ye bağlı: liste başında yok,
 * 24pt'de tam) durur. The search field always stays in place (the bottom tab bar no longer collapses on
 * scroll, and the search field followed it).
 */
export const FloatingSearchBar: React.FC<{ scrollY?: SharedValue<number> }> = ({ scrollY }) => {
  const topInset = useHeaderTopInset();
  const { width: windowWidth } = useWindowDimensions();
  const openSearch = useLockedPush('/search?focus=1');

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: topInset, paddingHorizontal: tabletSidePadding(spacing[3], windowWidth) }]} testID="app-shell-bar">
      <ScrollEdge
        barHeight={topInset + APP_SHELL_BAR_HEIGHT + theme.headerBottomPad}
        scrollY={scrollY}
        testID="app-shell-bar-edge"
      />
      <View pointerEvents="box-none" style={styles.row} testID="app-shell-bar-row">
        <ShellLeadingButton categoriesTestID="home-categories-button" />
        <View style={styles.search} testID="home-search-wrap">
          <SearchField testID="home-search-input" onPress={openSearch} />
        </View>
        <ShellHeaderActions />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // İçeriğin ÜSTÜNDE yüzer; dokunuşlar boş alanlardan içeriğe geçer (box-none).
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // The 44 pt glass circle sits on a 12 pt gutter (phones); tablets: the page gutter (set inline).
    // Diğer üst barlarla aynı alt pay (`theme.headerBottomPad`).
    paddingBottom: theme.headerBottomPad,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: APP_SHELL_BAR_HEIGHT,
    gap: spacing[2],
  },
  // Yükseklik cam düğmelerle aynı (44); satırda (52) dikey ortalı => eşit üst/alt boşluk (4pt).
  search: {
    flex: 1,
    minWidth: 0,
    height: GLASS_ICON_BUTTON_SIZE,
  },
});
