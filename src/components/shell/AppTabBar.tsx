import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { theme, Text, CountBadge, Icon, type IconName } from "@/ui";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useShellCounts } from "./useShellCounts";
import { TAB_PILL_HEIGHT, TAB_PILL_SIDE_GAP, tabPillBottomOffset } from "./tabBarLayout";

const { colors, spacing, iconSize, radius, shadow } = theme;

/** Orta "+" düğmesi (hapın içinde). */
const SELL_SIZE = 48;

// Sadece görünür sekmeler — sırasıyla. href:null olan (create, notifications/index)
// kasıtlı olarak dışarıda bırakılır. İkonlar web Heroicons adları; odaklı sekme `solid`, diğerleri `outline`.
// NOT: `sell` ve `badge` her girdide açıkça yazılır (`as const` literal tip erişimi için).
const VISIBLE = [
  { name: "index", testID: "tab-home", labelKey: "nav.home", icon: "home" as IconName, sell: false, badge: false },
  { name: "favorites/index", testID: "tab-favorites", labelKey: "nav.favorites", icon: "heart" as IconName, sell: false, badge: false },
  { name: "sell", testID: "tab-sell", labelKey: "", icon: "plus" as IconName, sell: true, badge: false },
  { name: "messages/index", testID: "tab-messages", labelKey: "message.messages", icon: "chat-bubble-left-right" as IconName, sell: false, badge: true },
  { name: "profile", testID: "tab-profile", labelKey: "nav.profile", icon: "user" as IconName, sell: false, badge: false },
] as const;

/**
 * Özel yüzen alt menü (düz RN View'lar): kenarlardan boşluklu, tam yuvarlak beyaz hap — ince
 * border + gölge (Android elevation), güvenli alanın üstünde. Ekranların üstüne biner
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

  // Klavye açıkken hap formun üstüne binmesin.
  if (keyboardHeight > 0) return null;

  // state.routes içindeki aktif route adını çöz (görünür sırayla eşleştir).
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabPillBottomOffset(insets.bottom) }]}
    >
      <View style={styles.pill} testID="app-tab-bar">
        {VISIBLE.map((tab) => {
          const focused = activeName === tab.name;
          const color = focused ? colors.primary[600]! : colors.text.subtle;
          const label = tab.labelKey ? t(tab.labelKey) : t("mobile.tabBarSell");

          return (
            <Pressable
              key={tab.name}
              testID={tab.testID}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                if (!focused) navigation.navigate(tab.name);
              }}
            >
              {tab.sell ? (
                <View style={styles.sellButton}>
                  <Icon name="plus" size={iconSize.lg + 4} color={colors.text.inverted} />
                </View>
              ) : (
                <View>
                  <Icon name={tab.icon} variant={focused ? "solid" : "outline"} size={iconSize.lg} color={color} />
                  {tab.badge && (
                    <CountBadge
                      count={messageCount}
                      ringColor={colors.surface.elevated}
                      style={styles.badge}
                    />
                  )}
                </View>
              )}
              {!!tab.labelKey && (
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
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_PILL_SIDE_GAP,
    right: TAB_PILL_SIDE_GAP,
  },
  pill: {
    height: TAB_PILL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadow.medium,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sellButton: {
    width: SELL_SIZE,
    height: SELL_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.primary[600],
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: spacing[0.5],
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2.5],
  },
});
