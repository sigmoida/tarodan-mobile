import { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import { RETURN_REQUEST_DAYS, DAMAGE_REPORT_DAYS } from "@/constants/legalFacts";

const { colors } = theme;

type FaqItem = { q: string; a: string };
type FaqSection = { category: string; questions: FaqItem[] };

/**
 * SSS içerikleri çeviriden geldiği için liste bir FABRİKA (bkz. `guides.tsx` /
 * `buildQuickActionItems`). Birkaç soru/cevap burada ve `help/_lib/faq.ts`de
 * (Yardım Merkezi) neredeyse birebir tekrar ediyordu; ortak olanlar tek
 * kaynağa (`faqShared.*`) taşındı, yalnız bu ekrana özgü olanlar `faqPage.*`de.
 */
const buildFaqSections = (t: TFunction): FaqSection[] => [
  {
    category: t("faq.buying"),
    questions: [
      { q: t("faqPage.buying.howToOrder.q"), a: t("faqPage.buying.howToOrder.a") },
      { q: t("faqShared.guestCheckout.q"), a: t("faqShared.guestCheckout.a") },
      { q: t("faqShared.paymentMethods.q"), a: t("faqShared.paymentMethods.a") },
      { q: t("faqPage.buying.offer.q"), a: t("faqPage.buying.offer.a") },
    ],
  },
  {
    category: t("faqShared.categories.selling"),
    questions: [
      { q: t("faqShared.howToList.q"), a: t("faqShared.howToList.a") },
      { q: t("faqShared.commissionRate.q"), a: t("faqShared.commissionRate.a") },
      { q: t("faqShared.payoutTiming.q"), a: t("faqShared.payoutTiming.a") },
      { q: t("faqPage.selling.listingLimit.q"), a: t("faqPage.selling.listingLimit.a") },
    ],
  },
  {
    category: t("faq.shipping"),
    questions: [
      { q: t("faqPage.shipping.deliveryTime.q"), a: t("faqPage.shipping.deliveryTime.a") },
      { q: t("faqPage.shipping.whoPaysShipping.q"), a: t("faqPage.shipping.whoPaysShipping.a") },
      { q: t("faqShared.orderTracking.q"), a: t("faqShared.orderTracking.a") },
    ],
  },
  {
    category: t("faq.trade"),
    questions: [
      { q: t("faqShared.howTradeWorks.q"), a: t("faqShared.howTradeWorks.a") },
      { q: t("faqShared.tradeSafety.q"), a: t("faqShared.tradeSafety.a") },
      { q: t("faqPage.trade.tradeFee.q"), a: t("faqPage.trade.tradeFee.a") },
    ],
  },
  {
    category: t("faqPage.categories.returns"),
    questions: [
      {
        q: t("faqPage.returns.returnWindow.q"),
        a: t("faqPage.returns.returnWindow.a", { days: RETURN_REQUEST_DAYS }),
      },
      {
        q: t("faqPage.returns.damagedItem.q"),
        a: t("faqPage.returns.damagedItem.a", { days: DAMAGE_REPORT_DAYS }),
      },
      { q: t("faqPage.returns.cancelOrder.q"), a: t("faqPage.returns.cancelOrder.a") },
    ],
  },
  {
    category: t("faqPage.categories.account"),
    questions: [
      { q: t("faqShared.premiumBenefits.q"), a: t("faqShared.premiumBenefits.a") },
      { q: t("faqShared.forgotPassword.q"), a: t("faqShared.forgotPassword.a") },
      { q: t("faqShared.deleteAccount.q"), a: t("faqShared.deleteAccount.a") },
    ],
  },
];

export default function FAQScreen() {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const faqSections = useMemo(() => buildFaqSections(t), [t]);

  let globalIndex = -1;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageFaq")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {faqSections.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            {section.questions.map((item) => {
              globalIndex++;
              const idx = globalIndex;
              const isExpanded = expandedIndex === idx;
              return (
                <View key={idx} style={styles.questionCard}>
                  <TouchableOpacity
                    style={styles.questionHeader}
                    onPress={() => setExpandedIndex(isExpanded ? null : idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionText}>{item.q}</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.primary[600]!}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("faqPage.footer.noAnswer")}</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push("/support")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={colors.white}
            />
            <Text style={styles.contactButtonText}>
              {t("faqPage.footer.contactSupport")}
            </Text>
          </TouchableOpacity>
        </View>

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
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.text.heading,
    marginBottom: theme.spacing[3],
  },
  questionCard: {
    backgroundColor: colors.surface.alt,
    borderRadius: theme.radius["2xl"],
    marginBottom: theme.spacing[2],
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing[3.5],
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.heading,
    marginRight: theme.spacing[3],
  },
  answerContainer: {
    paddingHorizontal: theme.spacing[3.5],
    paddingBottom: theme.spacing[3.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  answerText: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
    paddingTop: theme.spacing[3],
  },
  footer: {
    alignItems: "center",
    paddingVertical: theme.spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    marginTop: theme.spacing[2],
  },
  footerText: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius["2xl"],
    gap: theme.spacing[2],
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
