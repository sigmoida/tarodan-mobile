import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import * as Router from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GlassIconButton, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { useSideMenu } from './SideMenuContext';
import { useShellCounts } from './useShellCounts';
import { useTabBarCollapsedFlag, useTabBarProgress } from './TabBarCollapse';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';
import { barBackgroundOpacity, searchHideStyle } from './floatingBar';

const { colors, spacing } = theme;

/** Arama alanına çift dokunuşta iki /search açılmasın: bu süre içinde ikinci dokunuş yok sayılır. */
const SEARCH_TAP_LOCK_MS = 800;

/** Arama ekranını açar; kısa kilit çift dokunuşu tek açılışa indirir. */
function useOpenSearch(): () => void {
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    timer.current = setTimeout(() => {
      locked.current = false;
    }, SEARCH_TAP_LOCK_MS);
    Router.router.push('/search?focus=1');
  }, []);
}

/**
 * Ana sayfanın yüzen üst barı: solda ☰ (yan menü), ortada arama alanı, sağda sepet. ☰ ve sepet
 * `GlassIconButton` (cam daire). Liste başında beyaz bar zemini + arama alanı görünür; içerik aşağı
 * kaydırılınca (alt menüyle AYNI `collapsed` sinyali/süre/eğri: `useTabBarProgress`) bar zemini
 * solar ve arama alanı yukarı + sola kayarak kaybolur — yalnız iki cam buton yerinde kalır. Yukarı
 * kaydırınca / liste başına gelince geri döner. Zemin ve arama opacity alır; cam butonlar ASLA
 * (native cam ata opacity < 1 iken efektini kaybeder) — onlar animasyonlu bir atanın içinde değil.
 */
export const FloatingSearchBar: React.FC = () => {
  const topInset = useHeaderTopInset();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const openSearch = useOpenSearch();
  const { open: openMenu } = useSideMenu();
  const progress = useTabBarProgress();
  const hidden = useTabBarCollapsedFlag();

  const bgStyle = useAnimatedStyle(() => ({ opacity: barBackgroundOpacity(progress.value) }));
  const searchStyle = useAnimatedStyle(() => searchHideStyle(progress.value));

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: topInset }]} testID="app-shell-bar">
      <Animated.View pointerEvents="none" style={[styles.background, bgStyle]} testID="app-shell-bar-bg" />
      <View pointerEvents="box-none" style={styles.row} testID="app-shell-bar-row">
        <GlassIconButton
          icon="bars-3"
          accessibilityLabel={t('nav.menu')}
          testID="home-menu-button"
          onPress={openMenu}
        />
        <Animated.View
          style={[styles.search, searchStyle]}
          pointerEvents={hidden ? 'none' : 'auto'}
          accessibilityElementsHidden={hidden}
          importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          testID="home-search-wrap"
        >
          <SearchField testID="home-search-input" onPress={openSearch} />
        </Animated.View>
        <GlassIconButton
          icon="shopping-cart"
          accessibilityLabel={t('nav.cart')}
          count={counts.cartCount}
          testID="app-shell-cart"
          onPress={() => Router.router.push('/cart')}
        />
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
  search: {
    flex: 1,
    minWidth: 0,
  },
});
