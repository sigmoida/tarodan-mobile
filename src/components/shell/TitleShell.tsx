import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ScreenHeader, theme, useShellScrollState, type PageScrollValue } from '@/ui';

const { colors } = theme;

export interface TitleShellProps {
  title?: string;
  right?: React.ReactNode;
  /**
   * Ekranın kendi listesinin kaydırma sinyali (`usePageScrollValue()`; sekme kökleri
   * `useTabBarScrollHandler(undefined, page.scrollY)` ile tek handler'dan besler). Verilirse içerik
   * bar ALTINDAN kayar: liste `page.scrollProps` + `page.contentStyle` ile üst boşluğu kendisi açar.
   * Verilmezse gövde bar altında başlar ve kenar efekti SABİT şerittir.
   */
  scroll?: PageScrollValue;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sekme köklerinin başlıklı kabuğu (`AppShell variant="title"`): `ScreenHeader` ile AYNI yüzen bar
 * (ortalı başlık, cam butonlar, geri oku yok → sol boş) + kaydırma kenarı. İçerik tam yükseklikte;
 * bar üstünde yüzer.
 */
export const TitleShell: React.FC<TitleShellProps> = ({ title, right, scroll, children, contentStyle, testID }) => {
  const shell = useShellScrollState(scroll, false);
  return (
    <View style={styles.root} testID={testID}>
      <shell.Provider>
        <View
          testID="app-shell-content"
          style={[styles.content, !shell.bound && { paddingTop: shell.own.topInset }, contentStyle]}
        >
          {children}
        </View>
      </shell.Provider>
      <ScreenHeader
        title={title ?? ''}
        showBack={false}
        right={right}
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
