import { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { theme, Text, CountBadge, Icon, type IconName } from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useShellCounts } from "./useShellCounts";
import { useTabBarCollapsed } from "./TabBarCollapse";
import {
  TAB_PILL_HEIGHT,
  TAB_PILL_SIDE_GAP,
  TAB_SELL_GAP,
  TAB_SELL_SIZE,
  tabPillBottomOffset,
} from "./tabBarLayout";

const { colors, spacing, iconSize, radius, shadow, duration } = theme;

/** Daralma animasyonu: süre = theme.duration.normal (250ms), web `premium` eğrisi cubic-bezier(.4,0,.2,1). */
export const TAB_BAR_ANIM_MS = duration.normal;
const TAB_BAR_EASING = Easing.bezier(0.4, 0, 0.2, 1);
/** Gizlenirken hapın aşağı kayma payı ve küçülme oranı. */
const PILL_HIDE_TRANSLATE_Y = spacing[4];
const PILL_HIDE_SCALE = 0.9;

// Hap içindeki sekmeler (sırasıyla). href:null olan (create, notifications/index) kasıtlı olarak dışarıda.
// İkonlar web Heroicons adları; odaklı sekme `solid`, diğerleri `outline`.
const TABS = [
  { name: "index", testID: "tab-home", labelKey: "nav.home", icon: "home" as IconName, badge: false },
  { name: "messages/index", testID: "tab-messages", labelKey: "message.messages", icon: "chat-bubble-left-right" as IconName, badge: true },
  { name: "profile", testID: "tab-profile", labelKey: "nav.profile", icon: "user" as IconName, badge: false },
] as const;
const SELL_ROUTE = "sell";

/**
 * Özel yüzen alt menü (düz RN View'lar): solda 4 sekmeli beyaz hap (ince border + gölge), sağında
 * AYRI yuvarlak "+" (İlan Ver) düğmesi; ikisi aynı alt hizada/yükseklikte. İçerik aşağı kaydırılınca
 * (bkz. `useTabBarScrollHandler`) hap opacity + translateY + scale ile gizlenir, "+" sağdan sola
 * (alt sol köşe) kayar; yukarı kaydırınca geri gelir. Animasyon UI thread'inde (tek `progress`
 * türetilmiş değeri); "reduce motion" açıkken anında geçer. Ekranların üstüne biner
 * (`position:absolute`); içerik alt dolgusunu `useTabBarInset` verir.
 *
 * SDK 54 / RN 0.81 + New Architecture'da @react-navigation/bottom-tabs default `BottomTabBar`'ı
 * RELEASE (Fabric) render'da bozuk çiziyordu (ikonlar sola yığılıyor + sağda testere deseni;
 * dev'de sorunsuz). Düz flex satırıyla o native yolu tamamen atlıyoruz.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { messageCount } = useShellCounts();
  const keyboardHeight = useKeyboardHeight();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const collapsed = useTabBarCollapsed();
  // Gizli hap: dokunma + ekran okuyucu dışı (JS state; UI thread'inden scheduleOnRN ile).
  const [pillHidden, setPillHidden] = useState(false);

  // state.routes içindeki aktif route adını çöz (görünür sırayla eşleştir).
  const activeName = state.routes[state.index]?.name;

  // Sekme değişince ve oturum durumu değişince (ör. Profil üye <-> misafir görünümü) menü açık hale döner.
  const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
  useEffect(() => {
    collapsed.value = false;
  }, [activeName, isAuthenticated, collapsed]);

  useAnimatedReaction(
    () => collapsed.value,
    (isCollapsed, previous) => {
      if (isCollapsed !== previous) scheduleOnRN(setPillHidden, isCollapsed);
    },
  );

  // 0 = açık, 1 = daralmış. Tek kaynak; iki animasyonlu stil de bundan türer (eşzamanlı).
  const progress = useDerivedValue(() => {
    const target = collapsed.value ? 1 : 0;
    return reduceMotion
      ? target
      : withTiming(target, { duration: TAB_BAR_ANIM_MS, easing: TAB_BAR_EASING });
  });

  // "+" sağdaki yerinden sol kenara: satır genişliği - kendi genişliği.
  const sellTravel = Math.max(windowWidth - 2 * TAB_PILL_SIDE_GAP - TAB_SELL_SIZE, 0);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: progress.value * PILL_HIDE_TRANSLATE_Y },
      { scale: 1 - progress.value * (1 - PILL_HIDE_SCALE) },
    ],
  }));
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
        style={[styles.pill, pillStyle]}
        pointerEvents={pillHidden ? "none" : "auto"}
        accessibilityElementsHidden={pillHidden}
        importantForAccessibility={pillHidden ? "no-hide-descendants" : "auto"}
        testID="app-tab-pill"
      >
        {TABS.map((tab) => {
          const focused = activeName === tab.name;
          const color = focused ? colors.primary[600]! : theme.inactiveIconColor;
          const label = t(tab.labelKey);

          return (
            <Pressable
              key={tab.name}
              testID={tab.testID}
              style={[styles.item, focused && styles.itemActive]}
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
                    count={messageCount}
                    ringColor={focused ? colors.gray[100] : colors.surface.elevated}
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
          <Icon name="plus" size={iconSize.lg + 4} color={colors.text.inverted} />
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
  pill: {
    flex: 1,
    height: TAB_PILL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[1],
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadow.medium,
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
  sellWrap: {
    marginLeft: TAB_SELL_GAP,
  },
  sellButton: {
    width: TAB_SELL_SIZE,
    height: TAB_SELL_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.primary[600],
    justifyContent: "center",
    alignItems: "center",
    ...shadow.medium,
  },
  label: {
    marginTop: spacing[0.5],
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2.5],
  },
});
