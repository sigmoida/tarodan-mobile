import { Tabs } from "expo-router";
import { theme } from "@/ui";
import { useTranslation } from "react-i18next";
import { AppTabBar } from "./_components/AppTabBar";

const { colors } = theme;

/**
 * THIN tab layout — sadece route'ları tanımlar. İkon/label/rozet ve tüm görsel
 * tab bar mantığı `AppTabBar`'da (özel düz-View bar). SDK 54 / RN 0.81 + New
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
        tabBarActiveTintColor: colors.primary[600]!,
        tabBarInactiveTintColor: colors.text.subtle,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="search" options={{ title: t("common.search") }} />
      <Tabs.Screen name="sell" options={{ title: "" }} />
      <Tabs.Screen name="messages/index" options={{ title: t("message.messages") }} />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile") }} />
      {/* Hidden screens */}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
    </Tabs>
  );
}
