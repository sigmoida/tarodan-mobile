import React, { useEffect, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useScreenFocused } from '@/ui/lib/screenFocus';
import { TabBarView, type TabBarRoute } from './AppTabBar';
import { TabBarCollapseProvider, useTabBarCollapsed } from './TabBarCollapse';

/** Sekme rotası -> kök yığındaki `(tabs)` grubunun o sekmesi. */
export const TAB_BAR_HREF: Record<TabBarRoute, Href> = {
  index: '/(tabs)',
  sell: '/(tabs)/sell',
  'favorites/index': '/(tabs)/favorites',
  'cart/index': '/(tabs)/cart',
  profile: '/(tabs)/profile',
};

/**
 * Sekme dışı bir yığın ekranının alt menüsü (rota tabanlı; `Tabs` bağlamı yok). Görünüm `AppTabBar` ile
 * aynı (`TabBarView`); odakta sekme olmadığından vurgu yok ve daralınca Ana Sayfa gibi yalnız "+" kalır.
 * Dokunuş `router.dismissTo`: kök yığında alttaki `(tabs)`'a GERİ döner ve o sekmeye geçer (yeni bir
 * `(tabs)` örneği itilmez; `navigate` aynı adlı rotaya geri dönmez, üstüne iterdi). `(tabs)` yığında
 * yoksa (derin bağlantı) mevcut ekranın yerine açar. Ekran yeniden odaklanınca (detaydan geri dönüş)
 * menü açılır.
 */
export function StackTabBar() {
  const collapsed = useTabBarCollapsed();
  const focused = useScreenFocused();
  useEffect(() => {
    if (focused) collapsed.value = false;
  }, [focused, collapsed]);
  return <TabBarView onNavigate={(name) => router.dismissTo(TAB_BAR_HREF[name])} />;
}

/**
 * Bir yığın ekranını yüzen alt menüyle sarar (İlanlar, Kategori): ekrana özel daralma sinyali
 * (`TabBarCollapseProvider`) + ekranın üstünde menü. Menü ekranın PARÇASI olduğundan yığın geçişinde
 * (itme, geri, iOS kaydırarak geri) ekranla birlikte kayar; başka yığın ekranlarında görünmez.
 * Ekran listesini `useTabBarPageScroll()` ile bağlar ve alt dolgusuna `useTabBarInset()` ekler.
 */
export function withStackTabBar<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function ScreenWithTabBar(props: P) {
    return (
      <TabBarCollapseProvider>
        <View style={styles.fill}>
          <Screen {...props} />
          <StackTabBar />
        </View>
      </TabBarCollapseProvider>
    );
  }
  ScreenWithTabBar.displayName = `withStackTabBar(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return ScreenWithTabBar;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
