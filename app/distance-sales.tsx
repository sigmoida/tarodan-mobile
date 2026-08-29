import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import {
  RETURN_REQUEST_DAYS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
} from "@/constants/legalFacts";

const { colors } = theme;

export default function DistanceSalesScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageDistanceSales")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t("legalContact.lastUpdatedJan2026")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m1Title")}</Text>
        <Text style={styles.subTitle}>{t("distanceSalesPage.sellerLabel")}</Text>
        <Text style={styles.paragraph}>
          {t("distanceSalesPage.sellerBlock", {
            legalName: LEGAL_ENTITY.legalName,
            taxRegistration: LEGAL_ENTITY.taxRegistration,
            address: LEGAL_ENTITY.address,
            email: LEGAL_ENTITY.email,
            phone: LEGAL_ENTITY.phone,
          })}
        </Text>
        <Text style={styles.subTitle}>{t("distanceSalesPage.buyerLabel")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.buyerText")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m2Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m2Content")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m3Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m3Content")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m4Title")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m4Item1")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m4Item2")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m4Item3")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m4Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m5Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m5Content1")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m5Content2")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m6Title")}</Text>
        <Text style={styles.paragraph}>
          {t("distanceSalesPage.m6Content1", { days: RETURN_REQUEST_DAYS })}
        </Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m6Content2")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m7Title")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m7Item1")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m7Item2")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m7Item3")}</Text>
        <Text style={styles.listItem}>{t("distanceSalesPage.m7Item4")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m8Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m8Content1")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m8Content2")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m9Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m9Content")}</Text>

        <Text style={styles.sectionTitle}>{t("distanceSalesPage.m10Title")}</Text>
        <Text style={styles.paragraph}>{t("distanceSalesPage.m10Content")}</Text>

        <Text style={styles.contactInfo}>
          {t("legalContact.contactLabel", { value: LEGAL_EMAIL })}
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
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
});
