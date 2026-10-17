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
import { DEFAULT_SHELL_ACTIONS, DEFAULT_SHELL_LEADING, type ShellActions, type ShellLeading } from './shellLeading';

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
  /** Sol düğme: `categories` (varsayılan) ya da `none` (boş; yalnız Profil kökleri). */
  leading?: ShellLeading;
  /** Sağ grup: `inbox` (varsayılan: Mesajlar + Bildirimler) ya da `settings` (tek ⚙️; yalnız Profil). */
  actions?: ShellActions;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sekme köklerinin başlıklı kabuğu (`AppShell variant="title"`): `ScreenHeader` ile AYNI yüzen bar
 * (ortalı başlık, cam butonlar) + kaydırma kenarı. Geri oku yerine solda `ShellLeadingButton`
 * (kategoriler; Profil: boş), sağda `ShellHeaderActions` (Mesajlar + Bildirimler; Profil: tek ⚙️
 * Ayarlar) — Ana Sayfa'nın yüzen barıyla aynı düzen. Başka ekrana özel üst bar aksiyonu yok. İçerik
 * tam yükseklikte; bar üstünde yüzer.
 */
export const TitleShell: React.FC<TitleShellProps> = ({
  title,
  subtitle,
  scroll,
  leading: leadingKind = DEFAULT_SHELL_LEADING,
  actions = DEFAULT_SHELL_ACTIONS,
  children,
  contentStyle,
  testID,
}) => {
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
        right={<ShellHeaderActions actions={actions} />}
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
