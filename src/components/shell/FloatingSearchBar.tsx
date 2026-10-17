import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { GLASS_ICON_BUTTON_SIZE, ScrollEdge, getGlassView, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { ShellHeaderActions, ShellLeadingButton } from './ShellHeaderActions';
import { useLockedPush } from './useLockedPush';
import { useTabBarCollapsedFlag, useTabBarProgress } from './TabBarCollapse';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';
import { searchContentOpacity, searchHideStyle } from './floatingBar';

const { spacing } = theme;

/**
 * Ana sayfanın yüzen üst barı: solda kategoriler düğmesi (`ShellLeadingButton`), ortada arama alanı, sağda Mesajlar + Bildirimler
 * (sayaçlı; `ShellHeaderActions`). Düğmeler `GlassIconButton` (cam daire). Bar zeminsizdir; altında
 * diğer tüm üst barlarla AYNI kaydırma kenarı (`ScrollEdge`, `scrollY`'ye bağlı: liste başında yok,
 * 24pt'de tam) durur. İçerik aşağı kaydırılınca (alt menüyle AYNI `collapsed` sinyali/süre/eğri:
 * `useTabBarProgress`) arama alanı (düğmelerle aynı cam hap) yukarı + sola kayarak kaybolur — yalnız
 * cam düğmeler yerinde kalır; yukarı kaydırınca geri döner. Native cam ata `opacity < 1` iken
 * efektini kaybettiğinden camda arama SOLMAZ, ekranın üstünden kayıp çıkar ve yalnız içeriği solar
 * (`searchHideStyle`); cam düğmeler animasyonlu bir atanın içinde değil.
 */
export const FloatingSearchBar: React.FC<{ scrollY?: SharedValue<number> }> = ({ scrollY }) => {
  const topInset = useHeaderTopInset();
  const openSearch = useLockedPush('/search?focus=1');
  const progress = useTabBarProgress();
  const hidden = useTabBarCollapsedFlag();

  const glass = getGlassView() !== null;
  // Camda arama yüzeyi ekranın üstünden tamamen çıkar (bar + güvenli alan + pay).
  const glassHideY = -(topInset + APP_SHELL_BAR_HEIGHT + spacing[2]);
  const searchStyle = useAnimatedStyle(() => searchHideStyle(glass, progress.value, glassHideY));
  const searchContentStyle = useAnimatedStyle(() => ({ opacity: searchContentOpacity(glass, progress.value) }));

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: topInset }]} testID="app-shell-bar">
      <ScrollEdge
        barHeight={topInset + APP_SHELL_BAR_HEIGHT + theme.headerBottomPad}
        scrollY={scrollY}
        testID="app-shell-bar-edge"
      />
      <View pointerEvents="box-none" style={styles.row} testID="app-shell-bar-row">
        <ShellLeadingButton categoriesTestID="home-categories-button" />
        <Animated.View
          style={[styles.search, searchStyle]}
          pointerEvents={hidden ? 'none' : 'auto'}
          accessibilityElementsHidden={hidden}
          importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          testID="home-search-wrap"
        >
          <SearchField testID="home-search-input" onPress={openSearch} contentStyle={searchContentStyle} />
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
