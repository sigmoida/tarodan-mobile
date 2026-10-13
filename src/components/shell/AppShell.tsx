import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ScreenHeader, theme } from '@/ui';
import { FloatingSearchBar } from './FloatingSearchBar';
import { APP_SHELL_BAR_HEIGHT } from './tabBarLayout';

const { colors } = theme;

export interface AppShellProps {
  /**
   * `search` (varsayılan): hamburger (yan menü) + arama alanı + sepet — YALNIZ Ana Sayfa.
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

/**
 * Sekme köklerinin kabuğu. Ana Sayfa (`variant="search"`): içeriğin ÜSTÜNDE yüzen bar
 * (`FloatingSearchBar`): [☰ cam daire][arama alanı][sepet cam daire]; kaydırınca arama alanı yukarı +
 * sola kayıp kaybolur, bar zemini solar, yalnız iki cam buton kalır (alt menüyle aynı daralma sinyali).
 * Liste, `useFloatingBarInset` + `floatingBarScrollProps` ile üst boşluk bırakmalıdır. Diğer sekme
 * kökleri (`variant="title"`): `ScreenHeader` ile AYNI bar (geri oku yok → boş kutu çizilmez,
 * başlık sayfa kenar boşluğundan başlar), isteğe bağlı sağ aksiyon; beyaz zemin + alt çizgi, aynı
 * yükseklik (`theme.headerHeight`). StatusBar koyu içerik (kök layout varsayılanı) — kabuk
 * StatusBar'a dokunmaz.
 */
export const AppShell: React.FC<AppShellProps> = ({
  variant = 'search',
  title,
  right,
  children,
  contentStyle,
  testID,
}) => {
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

  // Ana Sayfa: içerik tam yükseklikte, bar ÜSTÜNDE yüzer (içerik altından kayar). Liste üst boşluğunu
  // `useFloatingBarInset` + `floatingBarScrollProps` ile kendisi verir.
  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
      <FloatingSearchBar />
    </View>
  );
};

export { APP_SHELL_BAR_HEIGHT };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  titleBar: {
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
});
