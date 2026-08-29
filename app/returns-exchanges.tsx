import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, Text, Card, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import {
  RETURN_REQUEST_DAYS,
  REFUND_PAYOUT_DAYS,
} from "@/constants/legalFacts";

const { colors } = theme;

function useSections(t: (key: string, opts?: Record<string, unknown>) => string) {
  return [
    {
      title: t("mobile.pageRefundPolicy"),
      content: t("returnsExchangesPage.policyContent", {
        days: RETURN_REQUEST_DAYS,
      }),
    },
    {
      title: t("information.returns.process"),
      content: t("returnsExchangesPage.processContent"),
    },
    {
      title: t("returnsExchangesPage.timelineTitle"),
      content: t("returnsExchangesPage.timelineContent", {
        days: REFUND_PAYOUT_DAYS,
      }),
    },
  ];
}

export default function ReturnsExchangesScreen() {
  const { t } = useTranslation();
  const sections = useSections(t);
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageReturns")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconRow}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.info[50]! }]}
          >
            <Ionicons
              name="repeat-outline"
              size={32}
              color={colors.info[600]!}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{t("mobile.pageReturns")}</Text>
            <Text style={styles.pageSubtitle}>
              {t("returnsExchangesPage.pageSubtitle")}
            </Text>
          </View>
        </View>

        {sections.map((s, i) => (
          <Card key={i} style={styles.card}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </Card>
        ))}

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
});
