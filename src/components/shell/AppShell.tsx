import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Router from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { HeaderIconButton, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { useShellCounts } from './useShellCounts';

const { colors, spacing, shadow, headerHeight } = theme;

export interface AppShellProps {
  children?: React.ReactNode;
  /** İçerik kabına ek stil. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const noopFocusEffect = (_cb: () => void | (() => void)) => undefined;

/** Ekran odaktayken true — bildirimsel (StatusBar bileşeni için); imperatif set/restore yarışı yok. */
function useIsScreenFocused(): boolean {
  const [focused, setFocused] = useState(false);
  const useFocus = (Router.useFocusEffect ?? noopFocusEffect) as typeof noopFocusEffect;
  useFocus(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}

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
 * Sekme köklerinin kabuğu — TÜM tab köklerinde (Ana Sayfa, Favoriler, Mesajlar, Profil, İlan Ver)
 * aynı bar, aynı yükseklik: primary-600 zemin, tek satır [arama alanı][bildirim][sepet].
 * Logo yok; ikonlar zeminsiz (`HeaderIconButton`). Sayfa başlığı gerekiyorsa barın altında
 * `PageHeader` ile verilir. Bu bilinçli bir web sapmasıdır (web telefonda logo + ikincil arama satırı).
 * Odaktayken StatusBar açık içerik.
 */
export const AppShell: React.FC<AppShellProps> = ({ children, contentStyle, testID }) => {
  const topInset = useHeaderTopInset();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const focused = useIsScreenFocused();
  const openSearch = useOpenSearch();

  return (
    <View style={styles.root} testID={testID}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={[styles.bar, { paddingTop: topInset }]} testID="app-shell-bar">
        <View style={styles.row}>
          <SearchField
            testID="home-search-input"
            onPress={openSearch}
          />
          <HeaderIconButton
            tone="onBrand"
            icon="notifications-outline"
            label={t('nav.notifications')}
            count={counts.notificationCount}
            testID="app-shell-notifications"
            onPress={() => Router.router.push('/notifications')}
          />
          <HeaderIconButton
            tone="onBrand"
            icon="cart-outline"
            label={t('nav.cart')}
            count={counts.cartCount}
            testID="app-shell-cart"
            onPress={() => Router.router.push('/cart')}
          />
        </View>
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

/**
 * Bar içerik satırı yüksekliği (güvenli alan hariç) = `theme.headerHeight`, yığın ekranlarının
 * ScreenHeader satırıyla AYNI: tab kökü <-> yığın ekranı geçişinde barın alt kenarı aynı y'de
 * kalır. Arama alanı (40) ve 44pt ikon kutuları bu satırda dikey ortalanır.
 */
export const APP_SHELL_BAR_HEIGHT = headerHeight;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  bar: {
    backgroundColor: colors.primary[600],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[700],
    // İkon kutusu 44pt, görsel 24: sağ kenarda ikonun görünür kenarı yine 16pt gutter'a oturur.
    paddingLeft: spacing[4],
    paddingRight: spacing[1.5],
    ...shadow.soft,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: APP_SHELL_BAR_HEIGHT,
    gap: spacing[1],
  },
  content: {
    flex: 1,
  },
});
