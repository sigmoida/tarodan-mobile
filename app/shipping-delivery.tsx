import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, Text, Card, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";

const { colors } = theme;

function useSections(t: (key: string) => string) {
  return [
    {
      title: t("information.shipping.methods"),
      content: t("shippingDeliveryPage.methodsContent"),
    },
    {
      title: t("information.shipping.costs"),
      content: t("shippingDeliveryPage.costsContent"),
    },
    {
      title: t("information.shipping.times"),
      content: t("shippingDeliveryPage.timesContent"),
    },
    {
      title: t("shippingDeliveryPage.trackingTitle"),
      content: t("shippingDeliveryPage.trackingContent"),
    },
  ];
}

export default function ShippingDeliveryScreen() {
  const { t } = useTranslation();
  const sections = useSections(t);
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageShipping")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="car-outline"
              size={32}
              color={colors.primary[600]!}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>
              {t("shippingDeliveryPage.pageTitle")}
            </Text>
            <Text style={styles.pageSubtitle}>
              {t("shippingDeliveryPage.pageSubtitle")}
            </Text>
          </View>
        </View>

        {sections.map((s, i) => (
          <Card key={i} style={styles.card}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </Card>
        ))}

        <TouchableOpacity
          style={styles.trackLink}
          onPress={() => router.push("/order-track")}
        >
          <Ionicons
            name="locate-outline"
            size={20}
            color={colors.primary[600]!}
          />
          <Text style={styles.trackLinkText}>
            {t("shippingDeliveryPage.trackLinkText")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.primary[600]!}
          />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  content: { flex: 1, padding: theme.spacing[4] },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing[5],
    gap: theme.spacing[3],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary[50]!,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: { fontSize: 20, fontWeight: "bold", color: colors.text.heading },
  pageSubtitle: {
    fontSize: 14,
    color: colors.text.subtle,
    marginTop: theme.spacing[0.5],
  },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    marginBottom: theme.spacing[3],
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.heading,
    marginBottom: theme.spacing[2],
  },
  sectionContent: { fontSize: 14, color: colors.text.muted, lineHeight: 22 },
  trackLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    padding: theme.spacing[4],
    borderRadius: 12,
    marginTop: theme.spacing[2],
  },
  trackLinkText: {
    flex: 1,
    marginLeft: theme.spacing[3],
    fontSize: 15,
    color: colors.primary[600]!,
    fontWeight: "500",
  },
});
