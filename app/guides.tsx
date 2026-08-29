import { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";

const { colors } = theme;

type Guide = {
  title: string;
  icon:
    | "cart-outline"
    | "pricetag-outline"
    | "cube-outline"
    | "swap-horizontal-outline"
    | "albums-outline"
    | "shield-outline";
  steps: string[];
};

/**
 * Rehber içerikleri çeviriden geldiği için liste bir FABRİKA: modül
 * seviyesinde kurulsaydı `t` daha hazır olmadan çalışır ve metinler ilk
 * dilde donardı (bkz. `buildQuickActionItems` — aynı gerekçe).
 */
const buildGuides = (t: TFunction): Guide[] => [
  {
    title: t("guides.howToBuy.title"),
    icon: "cart-outline",
    steps: [
      t("guides.howToBuy.step1"),
      t("guides.howToBuy.step2"),
      t("guides.howToBuy.step3"),
      t("guides.howToBuy.step4"),
      t("guides.howToBuy.step5"),
      t("guides.howToBuy.step6"),
      t("guides.howToBuy.step7"),
    ],
  },
  {
    title: t("guides.howToSell.title"),
    icon: "pricetag-outline",
    steps: [
      t("guides.howToSell.step1"),
      t("guides.howToSell.step2"),
      t("guides.howToSell.step3"),
      t("guides.howToSell.step4"),
      t("guides.howToSell.step5"),
      t("guides.howToSell.step6"),
      t("guides.howToSell.step7"),
      t("guides.howToSell.step8"),
    ],
  },
  {
    title: t("guides.shippingSteps.title"),
    icon: "cube-outline",
    steps: [
      t("guides.shippingSteps.step1"),
      t("guides.shippingSteps.step2"),
      t("guides.shippingSteps.step3"),
      t("guides.shippingSteps.step4"),
      t("guides.shippingSteps.step5"),
      t("guides.shippingSteps.step6"),
      t("guides.shippingSteps.step7"),
      t("guides.shippingSteps.step8"),
    ],
  },
  {
    title: t("guides.tradeGuide"),
    icon: "swap-horizontal-outline",
    steps: [
      t("guides.tradeSteps.step1"),
      t("guides.tradeSteps.step2"),
      t("guides.tradeSteps.step3"),
      t("guides.tradeSteps.step4"),
      t("guides.tradeSteps.step5"),
      t("guides.tradeSteps.step6"),
      t("guides.tradeSteps.step7"),
      t("guides.tradeSteps.step8"),
      t("guides.tradeSteps.step9"),
    ],
  },
  {
    title: t("guides.collectionGuide.title"),
    icon: "albums-outline",
    steps: [
      t("guides.collectionGuide.step1"),
      t("guides.collectionGuide.step2"),
      t("guides.collectionGuide.step3"),
      t("guides.collectionGuide.step4"),
      t("guides.collectionGuide.step5"),
      t("guides.collectionGuide.step6"),
      t("guides.collectionGuide.step7"),
    ],
  },
  {
    title: t("guides.safetyTips"),
    icon: "shield-outline",
    steps: [
      t("guides.safetySteps.step1"),
      t("guides.safetySteps.step2"),
      t("guides.safetySteps.step3"),
      t("guides.safetySteps.step4"),
      t("guides.safetySteps.step5"),
      t("guides.safetySteps.step6"),
      t("guides.safetySteps.step7"),
    ],
  },
];

export default function GuidesScreen() {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const guides = useMemo(() => buildGuides(t), [t]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageGuides")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t("guides.subtitle")}</Text>

        {guides.map((guide, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <View key={index} style={styles.guideCard}>
              <TouchableOpacity
                style={styles.guideHeader}
                onPress={() => setExpandedIndex(isExpanded ? null : index)}
                activeOpacity={0.7}
              >
                <View style={styles.guideHeaderLeft}>
                  <View style={styles.guideIconContainer}>
                    <Ionicons
                      name={guide.icon}
                      size={24}
                      color={colors.primary[600]!}
                    />
                  </View>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.text.muted}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.guideContent}>
                  {guide.steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>
                          {stepIndex + 1}
                        </Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

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
  intro: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: theme.spacing[5],
  },
  guideCard: {
    backgroundColor: colors.surface.alt,
    borderRadius: 12,
    marginBottom: theme.spacing[3],
    overflow: "hidden",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing[4],
  },
  guideHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  guideIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50]!,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing[3],
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
    flex: 1,
  },
  guideContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingTop: theme.spacing[3],
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing[2.5],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[600]!,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing[2.5],
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
});
