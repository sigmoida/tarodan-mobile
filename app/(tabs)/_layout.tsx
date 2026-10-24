import { Tabs } from "expo-router";
import { theme } from "@/ui";
import { useTranslation } from "react-i18next";
import { AppTabBar } from "@/components/shell/AppTabBar";

const { colors } = theme;

/**
 * THIN tab layout — sadece route'ları tanımlar. İkon/label/rozet ve tüm görsel
 * tab bar mantığı `AppTabBar`'da (özel yüzen hap, düz View'lar; `@/components/shell`). SDK 54 / RN 0.81 + New
 * Architecture'da default `BottomTabBar` RELEASE (Fabric) render'da bozuluyordu
 * (ikonlar sola yığılıyor + sağda testere deseni; dev'de sorunsuz) → AppTabBar
 * o native yolu tamamen atlar.
 */
export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.text.heading,
        tabBarInactiveTintColor: colors.text.heading,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="sell" options={{ title: "" }} />
      <Tabs.Screen
        name="favorites/index"
        options={{ title: t("nav.favorites") }}
      />
      <Tabs.Screen name="cart/index" options={{ title: t("nav.cart") }} />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile") }} />
      {/* Hidden screens */}
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}
