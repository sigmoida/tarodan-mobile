import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import {
  RETURN_REQUEST_DAYS,
  REFUND_PAYOUT_DAYS,
  DAMAGE_REPORT_DAYS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/constants/legalFacts";

const { colors } = theme;

export default function RefundPolicyScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageRefundPolicy")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s1Title")}</Text>
        <Text style={styles.paragraph}>
          {t("refundPolicyPage.s1Content", { days: RETURN_REQUEST_DAYS })}
        </Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s2Title")}</Text>
        <Text style={styles.listItem}>
          {t("refundPolicyPage.s2Item1", { days: RETURN_REQUEST_DAYS })}
        </Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s2Item2")}</Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s2Item3")}</Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s2Item4")}</Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s2Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s3Title")}</Text>
        <Text style={styles.subTitle}>{t("refundPolicyPage.step1Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.step1Content")}</Text>
        <Text style={styles.subTitle}>{t("refundPolicyPage.step2Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.step2Content")}</Text>
        <Text style={styles.subTitle}>{t("refundPolicyPage.step3Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.step3Content")}</Text>
        <Text style={styles.subTitle}>{t("refundPolicyPage.step4Title")}</Text>
        <Text style={styles.paragraph}>
          {t("refundPolicyPage.step4Content", { days: REFUND_PAYOUT_DAYS })}
        </Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s4Title")}</Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s4Item1")}</Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s4Item2")}</Text>
        <Text style={styles.listItem}>
          {t("refundPolicyPage.s4Item3", { days: RETURN_REQUEST_DAYS })}
        </Text>
        <Text style={styles.listItem}>{t("refundPolicyPage.s4Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s5Title")}</Text>
        <Text style={styles.paragraph}>
          {t("refundPolicyPage.s5Content", { days: DAMAGE_REPORT_DAYS })}
        </Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.s6Content")}</Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s7Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.s7Content")}</Text>

        <Text style={styles.sectionTitle}>{t("refundPolicyPage.s8Title")}</Text>
        <Text style={styles.paragraph}>{t("refundPolicyPage.s8Content")}</Text>

        <Text style={styles.contactInfo}>
          {t("legalContact.emailLabel", { value: SUPPORT_EMAIL })}
        </Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.phoneLabel", { value: SUPPORT_PHONE })}
        </Text>

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
  lastUpdated: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.heading,
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[3],
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  paragraph: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: theme.spacing[3],
  },
  listItem: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 24,
    marginLeft: theme.spacing[2],
  },
  contactInfo: {
    fontSize: 14,
    color: colors.primary[600]!,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
});
