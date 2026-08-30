import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import { SELLER_SUPPORT_EMAIL, LEGAL_ENTITY } from "@/constants/legalFacts";

const { colors } = theme;

export default function SellerAgreementScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageSellerAgreement")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s1Title")}</Text>
        <Text style={styles.paragraph}>
          {t("sellerAgreementPage.s1Content", {
            legalName: LEGAL_ENTITY.legalName,
          })}
        </Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s2Title")}</Text>
        <Text style={styles.paragraph}>{t("sellerAgreementPage.s2Content")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s3Title")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item1")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item2")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item3")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item4")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item5")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item6")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s3Item7")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s4Title")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s4Item1")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s4Item2")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s4Item3")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s4Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s5Title")}</Text>
        <Text style={styles.paragraph}>
          {t("sellerAgreementPage.s5Content")}
        </Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s5Item1")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s5Item2")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s5Item3")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("sellerAgreementPage.s6Content")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s7Title")}</Text>
        <Text style={styles.paragraph}>{t("sellerAgreementPage.s7Content")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s8Title")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s8Item1")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s8Item2")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s8Item3")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s8Item4")}</Text>
        <Text style={styles.listItem}>{t("sellerAgreementPage.s8Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s9Title")}</Text>
        <Text style={styles.paragraph}>{t("sellerAgreementPage.s9Content")}</Text>

        <Text style={styles.sectionTitle}>{t("sellerAgreementPage.s10Title")}</Text>
        <Text style={styles.paragraph}>{t("sellerAgreementPage.s10Content")}</Text>

        <Text style={styles.contactInfo}>
          {t("legalContact.contactLabel", { value: SELLER_SUPPORT_EMAIL })}
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
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
});
