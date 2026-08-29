import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

const { colors } = theme;

function useSteps(t: TFunction) {
  return [
    {
      icon: "search-outline" as const,
      title: t("safeTradePage.step1Title"),
      description: t("safeTradePage.step1Desc"),
    },
    {
      icon: "swap-horizontal-outline" as const,
      title: t("safeTradePage.step2Title"),
      description: t("safeTradePage.step2Desc"),
    },
    {
      icon: "chatbubbles-outline" as const,
      title: t("safeTradePage.step3Title"),
      description: t("safeTradePage.step3Desc"),
    },
    {
      icon: "checkmark-circle-outline" as const,
      title: t("safeTradePage.step4Title"),
      description: t("safeTradePage.step4Desc"),
    },
    {
      icon: "cube-outline" as const,
      title: t("safeTradePage.step5Title"),
      description: t("safeTradePage.step5Desc"),
    },
    {
      icon: "shield-checkmark-outline" as const,
      title: t("safeTradePage.step6Title"),
      description: t("safeTradePage.step6Desc"),
    },
  ];
}

export default function GuvenliTakasScreen() {
  const { t } = useTranslation();
  const STEPS = useSteps(t);
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageSafeTrade")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons
            name="swap-horizontal"
            size={56}
            color={colors.primary[600]!}
          />
          <Text style={styles.heroTitle}>{t("safeTradePage.heroTitle")}</Text>
          <Text style={styles.heroText}>{t("safeTradePage.heroText")}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t("safeTradePage.howItWorks")}</Text>
        {STEPS.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              {index < STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepIconRow}>
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={colors.primary[600]!}
                />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>{t("safeTradePage.securityGuarantees")}</Text>
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.warning[500]!}
            />
            <Text style={styles.guaranteeText}>{t("safeTradePage.guarantee1")}</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.warning[500]!}
            />
            <Text style={styles.guaranteeText}>{t("safeTradePage.guarantee2")}</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.warning[500]!}
            />
            <Text style={styles.guaranteeText}>{t("safeTradePage.guarantee3")}</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.warning[500]!}
            />
            <Text style={styles.guaranteeText}>{t("safeTradePage.guarantee4")}</Text>
          </View>
          <View style={styles.guaranteeRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.warning[500]!}
            />
            <Text style={styles.guaranteeText}>{t("safeTradePage.guarantee5")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("safeTradePage.whoCanTrade")}</Text>
        <Text style={styles.paragraph}>{t("safeTradePage.whoCanTradeText")}</Text>

        <Text style={styles.sectionTitle}>{t("safeTradePage.cashDiffTitle")}</Text>
        <Text style={styles.paragraph}>{t("safeTradePage.cashDiffText")}</Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push("/trades")}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.white} />
          <Text style={styles.ctaText}>{t("safeTradePage.ctaText")}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  content: {
    flex: 1,
    padding: theme.spacing[5],
  },
  hero: {
    alignItems: "center",
    paddingVertical: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text.heading,
    marginTop: theme.spacing[3],
  },
  heroText: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    textAlign: "center",
    marginTop: theme.spacing[2],
    paddingHorizontal: theme.spacing[2.5],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.heading,
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  stepCard: {
    flexDirection: "row",
    marginBottom: theme.spacing[1],
  },
  stepLeft: {
    alignItems: "center",
    width: 36,
    marginRight: theme.spacing[3],
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[600]!,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.primary[200]!,
    marginVertical: theme.spacing[1],
  },
  stepContent: {
    flex: 1,
    paddingBottom: theme.spacing[5],
  },
  stepIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
  guaranteeCard: {
    backgroundColor: colors.warning[50]!,
    borderRadius: 12,
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[2.5],
  },
  guaranteeText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
  paragraph: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: theme.spacing[3],
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[600]!,
    paddingVertical: theme.spacing[3.5],
    borderRadius: 12,
    marginTop: theme.spacing[6],
    gap: theme.spacing[2],
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
});
