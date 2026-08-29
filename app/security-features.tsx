import { View, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, Text, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";
import { SECURITY_EMAIL } from "@/constants/legalFacts";

const { colors } = theme;

function useFeatures() {
  const { t } = useTranslation();
  return [
    {
      icon: "lock-closed-outline" as const,
      title: t("securityFeatures.sslTitle"),
      description: t("securityFeatures.sslDesc"),
    },
    {
      icon: "shield-checkmark-outline" as const,
      title: t("securityFeatures.buyerProtectionTitle"),
      description: t("securityFeatures.buyerProtectionDesc"),
    },
    {
      icon: "card-outline" as const,
      title: t("securityFeatures.paymentInfraTitle"),
      description: t("securityFeatures.paymentInfraDesc"),
    },
    {
      icon: "person-circle-outline" as const,
      title: t("securityFeatures.identityTitle"),
      description: t("securityFeatures.identityDesc"),
    },
    {
      icon: "eye-off-outline" as const,
      title: t("information.security.dataPrivacy"),
      description: t("securityFeatures.dataPrivacyDesc"),
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      title: t("securityFeatures.messagingTitle"),
      description: t("securityFeatures.messagingDesc"),
    },
    {
      icon: "swap-horizontal-outline" as const,
      title: t("mobile.pageSafeTrade"),
      description: t("securityFeatures.secureTradeDesc"),
    },
    {
      icon: "alert-circle-outline" as const,
      title: t("securityFeatures.fraudTitle"),
      description: t("securityFeatures.fraudDesc"),
    },
    {
      icon: "flag-outline" as const,
      title: t("securityFeatures.reportingTitle"),
      description: t("securityFeatures.reportingDesc"),
    },
    {
      icon: "star-outline" as const,
      title: t("securityFeatures.ratingTitle"),
      description: t("securityFeatures.ratingDesc"),
    },
  ];
}

export default function SecurityFeaturesScreen() {
  const { t } = useTranslation();
  const FEATURES = useFeatures();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.pageSecurityFeatures")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Ionicons
            name="shield-checkmark"
            size={48}
            color={colors.primary[600]!}
          />
          <Text style={styles.introTitle}>
            {t("securityFeatures.introTitle")}
          </Text>
          <Text style={styles.introText}>
            {t("securityFeatures.introText")}
          </Text>
        </View>

        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons
                name={feature.icon}
                size={28}
                color={colors.primary[600]!}
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("securityFeatures.footerText")}
          </Text>
          <Text style={styles.contactInfo}>
            {t("legalContact.emailLabel", { value: SECURITY_EMAIL })}
          </Text>
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
  intro: {
    alignItems: "center",
    paddingVertical: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.heading,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  introText: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    textAlign: "center",
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: colors.surface.alt,
    borderRadius: 12,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50]!,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing[3.5],
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
    marginBottom: theme.spacing[1],
  },
  featureDesc: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
  footer: {
    marginTop: theme.spacing[4],
    padding: theme.spacing[4],
    backgroundColor: colors.surface.alt,
    borderRadius: 12,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: "center",
    marginBottom: theme.spacing[2],
  },
  contactInfo: {
    fontSize: 14,
    color: colors.primary[600]!,
    fontWeight: "600",
  },
});
