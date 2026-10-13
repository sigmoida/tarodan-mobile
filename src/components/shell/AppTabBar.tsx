import { useEffect } from "react";
import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { theme, Text, CountBadge, Icon, GlassSurface, getGlassView, usePressScale, type IconName } from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useShellCounts } from "./useShellCounts";
import {
  TAB_BAR_ANIM_MS,
  useTabBarCollapsed,
  useTabBarCollapsedFlag,
  useTabBarProgress,
} from "./TabBarCollapse";
import {
  TAB_PILL_HEIGHT,
  TAB_PILL_SIDE_GAP,
  TAB_SELL_GAP,
  TAB_SELL_SIZE,
  tabPillBottomOffset,
} from "./tabBarLayout";
import { pillContentOpacity, pillHideStyle } from "./tabBarScroll";
import { useTabHighlight } from "./useTabHighlight";

const { colors, spacing, iconSize, radius } = theme;

export { TAB_BAR_ANIM_MS };

/** Gizlenirken hapın aşağı kayma payı ve küçülme oranı. */
const PILL_HIDE_TRANSLATE_Y = spacing[4];
const PILL_HIDE_SCALE = 0.9;

// Hap içindeki sekmeler (sırasıyla): Ana Sayfa, Mesajlar, Bildirimler, Profil. href:null olan (create)
// kasıtlı olarak dışarıda; Favoriler artık yığın rotası (/favorites, yan menü). Rozet sayaçları
// `useShellCounts`'tan (tek kaynak). İkonlar web Heroicons adları; odaklı sekme `solid`, diğerleri `outline`.
const TABS = [
  { name: "index", testID: "tab-home", labelKey: "nav.home", icon: "home" as IconName, badge: null },
  { name: "messages/index", testID: "tab-messages", labelKey: "message.messages", icon: "chat-bubble-left-right" as IconName, badge: "messageCount" },
  { name: "notifications/index", testID: "tab-notifications", labelKey: "nav.notifications", icon: "bell" as IconName, badge: "notificationCount" },
  { name: "profile", testID: "tab-profile", labelKey: "nav.profile", icon: "user" as IconName, badge: null },
] as const;
const SELL_ROUTE = "sell";

/**
 * Özel yüzen alt menü (düz RN View'lar): solda 4 sekmeli hap [Ana Sayfa][Mesajlar][Bildirimler][Profil], sağında
 * AYRI yuvarlak "+" (İlan Ver) düğmesi; ikisi aynı alt hizada/yükseklikte. Yüzeyler `GlassSurface`:
 * iOS 26'da gerçek Liquid Glass (arkadaki içerik görünür; "+" primary tint), iOS < 26 / Android'de
 * opak beyaz hap (ince border + gölge) ve düz turuncu daire. İçerik aşağı kaydırılınca
 * (bkz. `useTabBarScrollHandler`) hap gizlenir, "+" sağdan sola (alt sol köşe) kayar; yukarı
 * kaydırınca geri gelir. Hap fallback'te opacity + translateY + scale ile; CAMDA opacity ile DEĞİL
 * (native cam ata opacity < 1 iken efektini kaybeder) aşağı kayıp ekran dışına çıkarak, içeriği
 * yüzeyin içinde soluklaşarak gizlenir. Animasyon UI thread'inde (tek `progress` türetilmiş değeri);
 * "reduce motion" açıkken anında geçer. Ekranların üstüne biner (`position:absolute`); içerik alt
 * dolgusunu `useTabBarInset` verir.
 *
 * SDK 54 / RN 0.81 + New Architecture'da @react-navigation/bottom-tabs default `BottomTabBar`'ı
 * RELEASE (Fabric) render'da bozuk çiziyordu (ikonlar sola yığılıyor + sağda testere deseni;
 * dev'de sorunsuz). Düz flex satırıyla o native yolu tamamen atlıyoruz.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const keyboardHeight = useKeyboardHeight();
  const { width: windowWidth } = useWindowDimensions();
  const collapsed = useTabBarCollapsed();
  // Gizli hap: dokunma + ekran okuyucu dışı (JS state; UI thread'inden scheduleOnRN ile).
  const pillHidden = useTabBarCollapsedFlag();
  const glass = getGlassView() !== null;

  // state.routes içindeki aktif route adını çöz (görünür sırayla eşleştir).
  const activeName = state.routes[state.index]?.name;

  // Sekme değişince ve oturum durumu değişince (ör. Profil üye <-> misafir görünümü) menü açık hale döner.
  const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
  useEffect(() => {
    collapsed.value = false;
  }, [activeName, isAuthenticated, collapsed]);

  // 0 = açık, 1 = daralmış. Tek kaynak; animasyonlu stillerin hepsi bundan türer (eşzamanlı).
  const progress = useTabBarProgress();

  // "+" sağdaki yerinden sol kenara: satır genişliği - kendi genişliği.
  const sellTravel = Math.max(windowWidth - 2 * TAB_PILL_SIDE_GAP - TAB_SELL_SIZE, 0);
  // Cam hap: alt kenarın ötesine tam kayar (yükseklik + alt boşluk + gölge payı).
  const glassHideY = TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom) + spacing[4];

  const pillStyle = useAnimatedStyle(() =>
    pillHideStyle(glass, progress.value, PILL_HIDE_TRANSLATE_Y, glassHideY, PILL_HIDE_SCALE),
  );
  // Yalnız camda: içerik (ikon + etiket) cam yüzeyin İÇİNDE soluklaşır.
  const pillContentStyle = useAnimatedStyle(() => ({ opacity: pillContentOpacity(glass, progress.value) }));
  const highlight = useTabHighlight(TABS.some((tb) => tb.name === activeName) ? activeName : undefined);
  const sellPress = usePressScale();
  const sellStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * sellTravel }],
  }));

  // Klavye açıkken menü formun üstüne binmesin (hook'lar yukarıda, sıra sabit).
  if (keyboardHeight > 0) return null;

  const sellFocused = activeName === SELL_ROUTE;
  const sellLabel = t("mobile.tabBarSell");

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabPillBottomOffset(insets.bottom) }]}
      testID="app-tab-bar"
    >
      <Animated.View
        style={[styles.pillWrap, pillStyle]}
        pointerEvents={pillHidden ? "none" : "auto"}
        accessibilityElementsHidden={pillHidden}
        importantForAccessibility={pillHidden ? "no-hide-descendants" : "auto"}
        testID="app-tab-pill"
      >
        <GlassSurface shape="pill" size={TAB_PILL_HEIGHT} opaque style={styles.pill}>
          <Animated.View style={[styles.pillContent, pillContentStyle]}>
            {/* Aktif sekme vurgusu: sekmeler arasında kayar (x / genişlik ölçümle). */}
            <Animated.View
              pointerEvents="none"
              testID="tab-highlight"
              style={[styles.highlight, highlight.style]}
            />
            {TABS.map((tab) => {
              const focused = activeName === tab.name;
              const color = focused ? colors.primary[600]! : theme.inactiveIconColor;
              const label = t(tab.labelKey);

              return (
                <TabItem
                  key={tab.name}
                  testID={tab.testID}
                  accessibilityLabel={label}
                  focused={focused}
                  onLayout={highlight.onItemLayout(tab.name)}
                  onPress={() => {
                    if (!focused) navigation.navigate(tab.name);
                  }}
                >
                  <View>
                    <Icon name={tab.icon} variant={focused ? "solid" : "outline"} size={iconSize.lg} color={color} />
                    {tab.badge && (
                      <CountBadge
                        count={counts[tab.badge]}
                        ringColor={focused ? colors.primary[50] : colors.surface.elevated}
                        style={styles.badge}
                      />
                    )}
                  </View>
                  <Text
                    variant="caption"
                    weight="medium"
                    color={color}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={styles.label}
                  >
                    {label}
                  </Text>
                </TabItem>
              );
            })}
          </Animated.View>
        </GlassSurface>
      </Animated.View>

      <Animated.View style={[styles.sellWrap, sellStyle]}>
        <Pressable
          testID="tab-sell"
          style={styles.sellButton}
          accessibilityRole="button"
          accessibilityLabel={sellLabel}
          accessibilityState={{ selected: sellFocused }}
          onPressIn={sellPress.onPressIn}
          onPressOut={sellPress.onPressOut}
          onPress={() => {
            if (!sellFocused) navigation.navigate(SELL_ROUTE);
          }}
        >
          <Animated.View style={sellPress.style}>
            {/* Camda interaktif cam: pointerEvents none yalnız fallback'te (native efekt dokunuşu ister). */}
            <GlassSurface
              shape="circle"
              size={TAB_SELL_SIZE}
              tint={colors.primary[600]}
              interactive
              pointerEvents={glass ? undefined : "none"}
            >
              <Icon name="plus" size={iconSize.lg + 4} color={colors.text.inverted} />
            </GlassSurface>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

interface TabItemProps {
  testID: string;
  accessibilityLabel: string;
  focused: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  onPress: () => void;
  children: React.ReactNode;
}

/** Hap sekmesi: dokunma alanı sabit; basınca yalnız içerik (ikon + etiket) hafifçe küçülür. */
function TabItem({ testID, accessibilityLabel, focused, onLayout, onPress, children }: TabItemProps) {
  const press = usePressScale();
  return (
    <Pressable
      testID={testID}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: focused }}
      onLayout={onLayout}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.itemContent, press.style]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_PILL_SIDE_GAP,
    right: TAB_PILL_SIDE_GAP,
    height: TAB_PILL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  pillWrap: {
    flex: 1,
    height: TAB_PILL_HEIGHT,
  },
  // Yüzey (cam / opak beyaz + kenarlık + gölge) `GlassSurface`'ten; burada yalnız yerleşim.
  pill: {
    alignSelf: "stretch",
    paddingHorizontal: spacing[1],
  },
  pillContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  item: {
    flex: 1,
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  // Aktif sekme vurgusu (sekmeler arasında kayar): çok hafif primary-50 (cam ve fallback'te aynı;
  // etiket/ikon primary-600 kalır, kontrast korunur). Konum/genişlik animasyonlu stilden
  // (`useTabHighlight`); burada yalnız sabit kısım.
  highlight: {
    position: "absolute",
    left: 0,
    top: spacing[2],
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primary[50],
  },
  itemContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  sellWrap: {
    marginLeft: TAB_SELL_GAP,
  },
  // Turuncu "+" (cam üstünde primary tint, fallback düz primary): yüzeyi GlassSurface çizer.
  sellButton: {
    width: TAB_SELL_SIZE,
    height: TAB_SELL_SIZE,
    borderRadius: radius.full,
  },
  label: {
    marginTop: spacing[0.5],
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2.5],
  },
});
