import { View, ScrollView, StyleSheet } from "react-native";
import { theme, Text, ScreenHeader } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { LEGAL_EMAIL } from "@/constants/legalFacts";

const { colors } = theme;

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageTerms")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s1Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s1Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s2Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s2Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s3Title")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s3Item1")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s3Item2")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s3Item3")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s3Item4")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s3Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s4Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s4Intro")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s4Item1")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s4Item2")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s4Item3")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s4Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s5Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s5Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s6Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s7Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s7Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s8Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s8Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s9Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s9Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s10Title")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s10Item1")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s10Item2")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s10Item3")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s10Item4")}</Text>
        <Text style={styles.listItem}>{t("termsPage.s10Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s11Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s11Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s12Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s12Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s13Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s13Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s14Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s14Content")}</Text>

        <Text style={styles.sectionTitle}>{t("termsPage.s15Title")}</Text>
        <Text style={styles.paragraph}>{t("termsPage.s15Intro")}</Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.emailLabel", { value: LEGAL_EMAIL })}
        </Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.addressLabel", {
            value: t("information.contactInfo.addressValue"),
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
