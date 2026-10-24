import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import {
  theme,
  Text,
  CountBadge,
  Icon,
  GlassSurface,
  usePressScale,
  useToastBottomInset,
  type IconName,
} from "@/ui";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useShellCounts } from "./useShellCounts";
import { TAB_PILL_HEIGHT, tabBarRowWidth, tabPillBottomOffset } from "./tabBarLayout";
import { useTabHighlight } from "./useTabHighlight";

const { colors, spacing, iconSize, radius } = theme;

/** Seçili sekme hap dolgusu: nötr açık gri (turuncu vurgu yok). */
const TAB_ACTIVE_FILL = colors.gray[100] as string;

/** Hapın iç yatay dolgusu. */
const PILL_PADDING_X = spacing[1];
/** The "+" item's filled circle: the tab icon box plus 4 pt (a negative margin keeps the labels aligned). */

const SELL_ROUTE = "sell";

// The five items in order: Home, Favorites, "+" (sell, in the centre), Cart, Profile. `href: null`
// (create) is deliberately not here; Messages and Notifications are stack routes opened from the top
// bar (`ShellHeaderActions`). Badge counts come from `useShellCounts` (one source). Icons are web
// Heroicons names; the focused tab is `solid`, the others `outline`.
const TABS = [
  { name: "index", testID: "tab-home", labelKey: "nav.home", icon: "home" as IconName, badge: null },
  { name: "favorites/index", testID: "tab-favorites", labelKey: "nav.favorites", icon: "heart" as IconName, badge: null },
  { name: SELL_ROUTE, testID: "tab-sell", labelKey: "mobile.tabBarSellLabel", icon: "plus" as IconName, badge: null },
  { name: "cart/index", testID: "tab-cart", labelKey: "nav.cart", icon: "shopping-cart" as IconName, badge: "cartCount" },
  { name: "profile", testID: "tab-profile", labelKey: "nav.profile", icon: "user" as IconName, badge: null },
] as const;
type TabDef = (typeof TABS)[number];
/** Menünün gidebildiği sekme rotaları (`Tabs` ekran adları), "+" (İlan Ver) dahil. */
export type TabBarRoute = TabDef["name"];
/** Item order, for tests and docs: the "+" is the centre (index 2). */
export const TAB_BAR_ORDER: readonly TabBarRoute[] = TABS.map((tab) => tab.name);

/**
 * Bottom tab bar (plain RN views): ONE fixed pill with five items side by side, Home, Favorites,
 * "+" (İlan Ver / Sell), Cart, Profile, the "+" exactly in the centre. It never collapses or shrinks:
 * it is always drawn at full size above the content (`position: absolute`; lists add
 * `useTabBarInset` as bottom padding). The "+" is drawn exactly like the other items (same icon
 * size, colour and outline/solid states) with its label. The surface is `GlassSurface` (iOS 26 Liquid Glass, opaque white elsewhere)
 * with a 1 pt `border.DEFAULT` edge on both variants (the card border), so the bar separates from
 * the content behind it. The selected item has the solid icon and the neutral grey highlight, which
 * slides between items. Phones: the window minus the side gaps; tablets: a centred floating pill
 * capped at `TAB_BAR_MAX_WIDTH` (the iPadOS floating tab bar look). Hidden while the keyboard is open.
 *
 * SDK 54 / RN 0.81 + New Architecture'da @react-navigation/bottom-tabs default `BottomTabBar`'ı
 * RELEASE (Fabric) render'da bozuk çiziyordu (ikonlar sola yığılıyor + sağda testere deseni;
 * dev'de sorunsuz). Düz flex satırıyla o native yolu tamamen atlıyoruz.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <TabBarView
      activeName={state.routes[state.index]?.name}
      onNavigate={(name) => navigation.navigate(name)}
    />
  );
}

export interface TabBarViewProps {
  /**
   * `Tabs` route name of the focused tab. On a non-tab stack screen (`StackTabBar`: category, search,
   * manufacturer / brand / model products) it is `undefined`: no highlight.
   */
  activeName?: string;
  /** Sekmeye / "+"ya dokunuş (odaktaki sekmeye dokunuşta çağrılmaz). */
  onNavigate: (name: TabBarRoute) => void;
}

/**
 * Menünün görünümü — navigasyondan bağımsız: `AppTabBar` (sekme kökleri, `Tabs` bağlamı) ve
 * `StackTabBar` (menülü yığın ekranları, rota tabanlı) aynı görünümü çizer.
 */
export function TabBarView({ activeName, onNavigate }: TabBarViewProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const keyboardHeight = useKeyboardHeight();
  const { width: windowWidth } = useWindowDimensions();

  // Row: window minus the side gaps, centred and capped on wide windows.
  const rowWidth = tabBarRowWidth(windowWidth);
  const rowInset = (windowWidth - rowWidth) / 2;
  const highlight = useTabHighlight(TABS.some((tb) => tb.name === activeName) ? activeName : undefined);

  // Toast yüzen hapın üstünde dursun (kök toast katmanına engel olarak bildirilir). Klavye açıkken
  // hap gizli: toast klavyenin üstüne iner.
  useToastBottomInset(keyboardHeight > 0 ? null : TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom));

  // Klavye açıkken menü formun üstüne binmesin (hook'lar yukarıda, sıra sabit).
  if (keyboardHeight > 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabPillBottomOffset(insets.bottom), left: rowInset, right: rowInset }]}
      testID="app-tab-bar"
    >
      <GlassSurface shape="pill" size={TAB_PILL_HEIGHT} opaque style={styles.pill} testID="app-tab-pill">
        <View style={styles.pillContent}>
          {/* Aktif sekme vurgusu: sekmeler arasında kayar (x / genişlik ölçümle). */}
          <Animated.View pointerEvents="none" testID="tab-highlight" style={[styles.highlight, highlight.style]} />
          {TABS.map((tab) => {
            const focused = activeName === tab.name;
            const isSell = tab.name === SELL_ROUTE;
            // Etiket/ikon üst bar ikonlarıyla aynı renk (başlık rengi); seçili sekme dolu ikon + nötr hap ile ayrışır.
            const color = colors.text.heading;
            const label = t(tab.labelKey);
            return (
              <TabItem
                key={tab.name}
                testID={tab.testID}
                accessibilityLabel={label}
                focused={focused}
                onLayout={highlight.onItemLayout(tab.name)}
                onPress={() => {
                  if (!focused) onNavigate(tab.name);
                }}
              >
                <View testID={isSell ? "tab-sell-icon" : undefined}>
                  <Icon name={tab.icon} variant={focused ? "solid" : "outline"} size={iconSize.lg} color={color} />
                  {tab.badge && (
                    <CountBadge
                      count={counts[tab.badge]}
                      ringColor={focused ? TAB_ACTIVE_FILL : colors.surface.elevated}
                      style={styles.badge}
                    />
                  )}
                </View>
                <Text
                  variant="caption"
                  weight="semibold"
                  color={color}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  maxFontSizeMultiplier={theme.typography.maxFontScale.control}
                  style={styles.label}
                >
                  {label}
                </Text>
              </TabItem>
            );
          })}
        </View>
      </GlassSurface>
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
    // `left` / `right` come from the row width (`tabBarRowWidth`): the side gap on phones.
    position: "absolute",
    height: TAB_PILL_HEIGHT,
  },
  // Yüzey (cam / opak beyaz + gölge) `GlassSurface`'ten. The card border (1 pt `border.DEFAULT`) on
  // both variants: the glass surface has none of its own, the opaque one already uses the same edge.
  pill: {
    alignSelf: "stretch",
    paddingHorizontal: PILL_PADDING_X,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  pillContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  // At least 44 pt high and about a fifth of the row wide: comfortable touch targets.
  item: {
    flex: 1,
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    minHeight: theme.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  // Aktif sekme vurgusu (sekmeler arasında kayar): nötr açık gri hap. Konum/genişlik animasyonlu
  // stilden (`useTabHighlight`); burada yalnız sabit kısım.
  highlight: {
    position: "absolute",
    left: 0,
    top: spacing[2],
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    borderRadius: radius.full,
    backgroundColor: TAB_ACTIVE_FILL,
  },
  itemContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Etiket boyu ölçekten bağımsız rol (`theme.tabBarLabel`): hap genişliğine sığar.
  label: {
    marginTop: spacing[0.5],
    ...theme.tabBarLabel,
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2.5],
  },
});
