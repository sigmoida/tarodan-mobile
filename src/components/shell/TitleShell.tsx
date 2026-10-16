import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  ScreenHeader,
  ShellScrollProvider,
  theme,
  useResetScrollOnBind,
  useShellScrollState,
  type PageScrollValue,
} from '@/ui';
import { ShellHeaderActions, ShellLeadingButton } from './ShellHeaderActions';
import { useEdgeSwipeWhenFocused } from './SideMenuContext';
import { DEFAULT_SHELL_LEADING, type ShellLeading } from './shellLeading';

const { colors } = theme;

export interface TitleShellProps {
  title?: string;
  /** Başlığın altında küçük satır (ör. sepetteki ürün sayısı). */
  subtitle?: string;
  /**
   * Ekranın kendi listesinin kaydırma sinyali (`usePageScrollValue()`; sekme kökleri
   * `useTabBarScrollHandler(undefined, page.scrollY)` ile tek handler'dan besler). Verilirse içerik
   * bar ALTINDAN kayar: liste `page.scrollProps` + `page.contentStyle` ile üst boşluğu kendisi açar.
   * Verilmezse gövde bar altında başlar ve kenar efekti SABİT şerittir.
   */
  scroll?: PageScrollValue;
  /** Sol düğme: `categories` (varsayılan) ya da `menu` (☰, yalnız Profil kökleri). */
  leading?: ShellLeading;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sekme köklerinin başlıklı kabuğu (`AppShell variant="title"`): `ScreenHeader` ile AYNI yüzen bar
 * (ortalı başlık, cam butonlar) + kaydırma kenarı. Geri oku yerine solda `ShellLeadingButton` (Profil: ☰ yan menü; diğerleri: kategoriler), sağda TAM iki
 * düğme: Mesajlar + Bildirimler (`ShellHeaderActions`) — Ana Sayfa'nın yüzen barıyla aynı düzen.
 * Ekrana özel üst bar aksiyonu yok (sağ grup sabit). İçerik tam yükseklikte; bar üstünde yüzer.
 */
export const TitleShell: React.FC<TitleShellProps> = ({
  title,
  subtitle,
  scroll,
  leading: leadingKind = DEFAULT_SHELL_LEADING,
  children,
  contentStyle,
  testID,
}) => {
  // Yan menü soldan kaydırma yalnız ☰'lı (Profil) kabuk odaktayken etkin.
  useEdgeSwipeWhenFocused(leadingKind === 'menu');
  const shell = useShellScrollState(scroll, false);
  useResetScrollOnBind(shell.page.scrollY, shell.bound);
  return (
    <View style={styles.root} testID={testID}>
      <ShellScrollProvider value={shell.ctx}>
        <View
          testID="app-shell-content"
          style={[styles.content, !shell.bound && { paddingTop: shell.own.topInset }, contentStyle]}
        >
          {children}
        </View>
      </ShellScrollProvider>
      <ScreenHeader
        title={title ?? ''}
        subtitle={subtitle}
        leading={<ShellLeadingButton leading={leadingKind} categoriesTestID="app-shell-categories" />}
        right={<ShellHeaderActions />}
        testID="app-shell-bar"
        scrollY={shell.bound ? shell.page.scrollY : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  content: {
    flex: 1,
  },
});
