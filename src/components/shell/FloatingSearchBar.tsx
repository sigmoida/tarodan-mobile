import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GLASS_ICON_BUTTON_SIZE, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { ShellHeaderActions, ShellLeadingButton } from './ShellHeaderActions';
import { useLockedPush } from './useLockedPush';
import { useTabBarCollapsedFlag, useTabBarProgress } from './TabBarCollapse';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';
import { barBackgroundOpacity, searchHideStyle } from './floatingBar';

const { colors, spacing } = theme;

/**
 * Ana sayfanın yüzen üst barı: solda kategoriler düğmesi (`ShellLeadingButton`), ortada arama alanı, sağda Mesajlar + Bildirimler
 * (sayaçlı; `ShellHeaderActions`). Düğmeler `GlassIconButton` (cam daire). Liste başında beyaz bar
 * zemini + arama alanı görünür; içerik aşağı kaydırılınca (alt menüyle AYNI `collapsed` sinyali/süre/
 * eğri: `useTabBarProgress`) bar zemini solar ve arama alanı yukarı + sola kayarak kaybolur — yalnız
 * cam düğmeler yerinde kalır. Yukarı kaydırınca / liste başına gelince geri döner. Zemin ve arama
 * opacity alır; cam düğmeler ASLA (native cam ata opacity < 1 iken efektini kaybeder) — onlar
 * animasyonlu bir atanın içinde değil.
 */
export const FloatingSearchBar: React.FC = () => {
  const topInset = useHeaderTopInset();
  const openSearch = useLockedPush('/search?focus=1');
  const progress = useTabBarProgress();
  const hidden = useTabBarCollapsedFlag();

  const bgStyle = useAnimatedStyle(() => ({ opacity: barBackgroundOpacity(progress.value) }));
  const searchStyle = useAnimatedStyle(() => searchHideStyle(progress.value));

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: topInset }]} testID="app-shell-bar">
      <Animated.View pointerEvents="none" style={[styles.background, bgStyle]} testID="app-shell-bar-bg" />
      <View pointerEvents="box-none" style={styles.row} testID="app-shell-bar-row">
        <ShellLeadingButton menuTestID="home-menu-button" categoriesTestID="home-categories-button" />
        <Animated.View
          style={[styles.search, searchStyle]}
          pointerEvents={hidden ? 'none' : 'auto'}
          accessibilityElementsHidden={hidden}
          importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          testID="home-search-wrap"
        >
          <SearchField testID="home-search-input" onPress={openSearch} />
        </Animated.View>
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
    // Cam daire (44pt) kenarı 12pt gutter'a oturur.
    paddingHorizontal: spacing[3],
    // Diğer üst barlarla aynı alt pay (`theme.headerBottomPad`).
    paddingBottom: theme.headerBottomPad,
    zIndex: 1,
  },
  // Beyaz bar zemini + alt çizgi (ScreenHeader ile aynı kural); durum çubuğu bölgesini de kaplar.
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
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
