import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { theme } from "@/ui";
import { useUnreadCountQuery } from "@/hooks/messaging";
import { useTranslation } from "react-i18next";

const { colors } = theme;

// Sadece görünür sekmeler — sırasıyla. href:null olan (create,
// notifications/index) kasıtlı olarak dışarıda bırakılır.
// NOT: `sell` ve `badge` her girdide açıkça yazılır. `as const` her satırı ayrı
// bir literal tipe çevirdiğinden, anahtar yalnız bazı girdilerde olsaydı
// `tab.sell` / `tab.badge` erişimi TS2339 verirdi.
const VISIBLE = [
  { name: "index", labelKey: "nav.home", icon: "home", iconOutline: "home-outline", sell: false, badge: false },
  { name: "search", labelKey: "common.search", icon: "search", iconOutline: "search-outline", sell: false, badge: false },
  { name: "sell", labelKey: "", icon: "add", iconOutline: "add", sell: true, badge: false },
  { name: "messages/index", labelKey: "message.messages", icon: "chatbubbles", iconOutline: "chatbubbles-outline", sell: false, badge: true },
  { name: "profile", labelKey: "nav.profile", icon: "person", iconOutline: "person-outline", sell: false, badge: false },
] as const;

/**
 * Özel alt tab bar (düz RN View'lar). SDK 54 / RN 0.81 + New Architecture'da
 * @react-navigation/bottom-tabs default `BottomTabBar`'ı RELEASE (Fabric) render'da
 * bozuk çiziyordu (ikonlar sola yığılıyor + sağda testere deseni; dev'de sorunsuz).
 * Düz flex satırıyla o native yolu tamamen atlıyoruz.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const bottom = Math.max(insets.bottom, 8);

  // state.routes içindeki aktif route adını çöz (görünür sırayla eşleştir).
  const activeName = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: bottom, height: 56 + bottom }]}>
      {VISIBLE.map((tab) => {
        const focused = activeName === tab.name;
        const color = focused ? colors.primary[600]! : colors.text.subtle;
        const iconName = (focused ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap;

        return (
          <Pressable
            key={tab.name}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={tab.labelKey ? t(tab.labelKey) : t("mobile.tabBarSell")}
            onPress={() => {
              if (!focused) navigation.navigate(tab.name);
            }}
          >
            {tab.sell ? (
              <View style={styles.sellButton}>
                <Ionicons name="add" size={28} color={colors.white} />
              </View>
            ) : (
              <View>
                <Ionicons name={iconName} size={24} color={color} />
                {tab.badge && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {!!tab.labelKey && (
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {t(tab.labelKey)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    paddingTop: theme.spacing[2],
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600]!,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: theme.spacing[0.5],
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -5,
    backgroundColor: colors.danger[600]!,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.surface.DEFAULT,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
  },
});
