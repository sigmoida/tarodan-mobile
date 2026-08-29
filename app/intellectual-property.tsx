import { View, ScrollView, StyleSheet } from "react-native";
import { theme, Text, ScreenHeader } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { IP_EMAIL, LEGAL_ENTITY } from "@/constants/legalFacts";

const { colors } = theme;

export default function IntellectualPropertyScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageIp")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s1Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s1Content", { entity: LEGAL_ENTITY.legalName })}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s2Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s2Content")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s3Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s3Content1")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s3Content2")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s4Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s4Content")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s5Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s5Intro")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s5Item1")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s5Item2")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s5Item3")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s5Item4")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s5Item5")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s6Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s6Intro")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s6Item1")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s6Item2")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s6Item3")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s7Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s7Content")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s8Title")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s8Item1")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s8Item2")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s8Item3")}</Text>
        <Text style={styles.listItem}>{t("ipPage.s8Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("ipPage.s9Title")}</Text>
        <Text style={styles.paragraph}>{t("ipPage.s9Intro")}</Text>
        <Text style={styles.contactInfo}>
          {t("legalContact.emailLabel", { value: IP_EMAIL })}
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
