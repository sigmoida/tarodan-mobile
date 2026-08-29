import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import { PRIVACY_EMAIL } from "@/constants/legalFacts";

const { colors } = theme;

export default function CookiePolicyScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageCookies")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s1Title")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s1Content")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s2Title")}</Text>

        <Text style={styles.subTitle}>{t("cookiesPage.s2aTitle")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s2aContent")}</Text>

        <Text style={styles.subTitle}>{t("cookiesPage.s2bTitle")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s2bContent")}</Text>

        <Text style={styles.subTitle}>{t("cookiesPage.s2cTitle")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s2cContent")}</Text>

        <Text style={styles.subTitle}>{t("cookiesPage.s2dTitle")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s2dContent")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s3Title")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s3Intro")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s3Item1")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s3Item2")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s3Item3")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s3Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s4Title")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s4Intro")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s4Item1")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s4Item2")}</Text>
        <Text style={styles.listItem}>{t("cookiesPage.s4Item3")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s4Outro")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s5Title")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s5Content")}</Text>

        <Text style={styles.sectionTitle}>{t("cookiesPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("cookiesPage.s6Intro")}</Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.emailLabel", { value: PRIVACY_EMAIL })}
        </Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.addressLabel", {
            value: t("cookiesPage.locationValue"),
          })}
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
    marginTop: theme.spacing[4],
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
    marginBottom: theme.spacing[2],
  },
});
