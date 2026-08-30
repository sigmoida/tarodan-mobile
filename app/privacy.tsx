import { View, ScrollView, StyleSheet } from "react-native";
import { theme, Text, ScreenHeader } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PRIVACY_EMAIL, LEGAL_ENTITY } from "@/constants/legalFacts";

const { colors } = theme;

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pagePrivacy")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s1Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s1Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s2Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s2Intro")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s2Item1")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s2Item2")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s2Item3")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s2Item4")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s2Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s3Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s3Intro")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item1")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item2")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item3")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item4")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item5")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s3Item6")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s4Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s4Intro")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s4Item1")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s4Item2")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s4Item3")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s4Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s5Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s5Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s6Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s7Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s7Intro")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s7Item1")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s7Item2")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s7Item3")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s7Item4")}</Text>
        <Text style={styles.listItem}>{t("privacyPage.s7Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s8Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s8Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s9Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s9Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s10Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s10Content")}</Text>

        <Text style={styles.sectionTitle}>{t("privacyPage.s11Title")}</Text>
        <Text style={styles.paragraph}>{t("privacyPage.s11Intro")}</Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.emailLabel", { value: PRIVACY_EMAIL })}
        </Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.addressLabel", { value: LEGAL_ENTITY.address })}
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
