import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Router from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HeaderIconButton, ScreenHeader, theme, useHeaderTopInset } from '@/ui';
import { SearchField } from './SearchField';
import { useShellCounts } from './useShellCounts';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';

const { colors, spacing } = theme;

export interface AppShellProps {
  /**
   * `search` (varsayılan): arama alanı + bildirim + sepet — YALNIZ Ana Sayfa.
   * `title`: standart beyaz başlıklı üst bar (ScreenHeader ile aynı görünüm, geri oku yok) — diğer
   * tüm sekme kökleri.
   */
  variant?: 'search' | 'title';
  /** `variant="title"` için bar başlığı. */
  title?: string;
  /** `variant="title"` için sağ aksiyon(lar) (`TopBarAction`). */
  right?: React.ReactNode;
  children?: React.ReactNode;
  /** İçerik kabına ek stil. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
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
 * Sekme köklerinin kabuğu. Ana Sayfa (`variant="search"`): tek satır [arama alanı][bildirim][sepet],
 * logo yok, ikonlar zeminsiz primary-600 (`HeaderIconButton`). Diğer sekme kökleri
 * (`variant="title"`): `ScreenHeader` ile AYNI bar (geri oku yerine boş kutu: başlık yığın
 * ekranlarıyla aynı x'te başlar), isteğe bağlı sağ aksiyon. İki varyantta da beyaz zemin + alt çizgi
 * ve aynı yükseklik (`theme.headerHeight`). Bu bilinçli bir web sapmasıdır (web telefonda logo +
 * ikincil arama satırı). StatusBar koyu içerik (kök layout varsayılanı) — kabuk StatusBar'a dokunmaz.
 */
export const AppShell: React.FC<AppShellProps> = ({
  variant = 'search',
  title,
  right,
  children,
  contentStyle,
  testID,
}) => {
  const topInset = useHeaderTopInset();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const openSearch = useOpenSearch();

  if (variant === 'title') {
    return (
      <View style={styles.root} testID={testID}>
        <ScreenHeader
          title={title ?? ''}
          showBack={false}
          right={right}
          testID="app-shell-bar"
          style={styles.titleBar}
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.bar, { paddingTop: topInset }]} testID="app-shell-bar">
        <View style={styles.row}>
          <SearchField
            testID="home-search-input"
            onPress={openSearch}
          />
          <HeaderIconButton
            tone="primary"
            icon="bell"
            label={t('nav.notifications')}
            count={counts.notificationCount}
            testID="app-shell-notifications"
            onPress={() => Router.router.push('/notifications')}
          />
          <HeaderIconButton
            tone="primary"
            icon="shopping-cart"
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

export { APP_SHELL_BAR_HEIGHT };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  bar: {
    // ScreenHeader ile aynı kural: beyaz (surface.elevated) zemin + 1px alt çizgi, gölge yok.
    backgroundColor: colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    // İkon kutusu 44pt, görsel 24: sağ kenarda ikonun görünür kenarı yine 16pt gutter'a oturur.
    paddingLeft: spacing[4],
    paddingRight: spacing[1.5],
    zIndex: 1,
  },
  titleBar: {
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
