import { useEffect } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { theme, Text, CountBadge, Icon, GlassSurface, getGlassView, type IconName } from "@/ui";
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
            {TABS.map((tab) => {
              const focused = activeName === tab.name;
              const color = focused ? colors.primary[600]! : theme.inactiveIconColor;
              const label = t(tab.labelKey);

              return (
                <Pressable
                  key={tab.name}
                  testID={tab.testID}
                  style={[styles.item, focused && (glass ? styles.itemActiveGlass : styles.itemActive)]}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: focused }}
                  onPress={() => {
                    if (!focused) navigation.navigate(tab.name);
                  }}
                >
                  <View>
                    <Icon name={tab.icon} variant={focused ? "solid" : "outline"} size={iconSize.lg} color={color} />
                    {tab.badge && (
                      <CountBadge
                        count={counts[tab.badge]}
                        ringColor={focused && !glass ? colors.gray[100] : colors.surface.elevated}
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
                </Pressable>
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
          onPress={() => {
            if (!sellFocused) navigation.navigate(SELL_ROUTE);
          }}
        >
          <GlassSurface shape="circle" size={TAB_SELL_SIZE} tint={colors.primary[600]} pointerEvents="none">
            <Icon name="plus" size={iconSize.lg + 4} color={colors.text.inverted} />
          </GlassSurface>
        </Pressable>
      </Animated.View>
    </View>
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
  // Aktif sekme: arkasında yumuşak gri yuvarlatılmış vurgu.
  itemActive: {
    backgroundColor: colors.gray[100],
  },
  // Camda vurgu yarı saydam gri: arkadaki cam görünür kalır.
  itemActiveGlass: {
    backgroundColor: colors.overlay.black10,
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
