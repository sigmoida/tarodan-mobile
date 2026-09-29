import type React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, Text, Card, ScreenHeader } from "@/ui";
import { useTranslation } from "react-i18next";

const { colors } = theme;

// Metinler katalogda (`aboutPage.*`) — eskiden sabit Türkçe idi, İngilizce
// cihazda (App Review) sayfanın tamamı Türkçe görünüyordu.
const ABOUT_SECTIONS: ReadonlyArray<{
  key: "story" | "mission" | "values";
  icon: React.ComponentProps<typeof Ionicons>["name"];
}> = [
  { key: "story", icon: "book-outline" },
  { key: "mission", icon: "flag-outline" },
  { key: "values", icon: "heart-outline" },
];

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("mobile.pageAbout")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/" as any)
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="car-sport" size={48} color={colors.primary[600]!} />
          <Text variant="h1" style={styles.title}>
            Tarodan
          </Text>
          <Text variant="body" style={styles.subtitle}>
            {t("aboutPage.subtitle")}
          </Text>
        </View>

        {ABOUT_SECTIONS.map((section) => (
          <Card key={section.key} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={22} color={colors.primary[600]!} />
              <Text variant="h3" style={styles.sectionTitle}>
                {t(`aboutPage.${section.key}Title`)}
              </Text>
            </View>
            <Text variant="body" style={styles.text}>
              {t(`aboutPage.${section.key}Text`)}
            </Text>
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  content: { padding: theme.spacing[4] },
  header: { alignItems: "center", paddingVertical: theme.spacing[8] },
  title: {
    fontWeight: "bold",
    color: colors.text.heading,
    marginTop: theme.spacing[3],
  },
  subtitle: {
    color: colors.text.muted,
    marginTop: theme.spacing[1],
    textAlign: "center",
  },
  card: {
    marginBottom: theme.spacing[4],
    backgroundColor: colors.surface.DEFAULT,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontWeight: "600",
    marginLeft: theme.spacing[2],
    color: colors.text.heading,
  },
  text: { color: colors.text.muted, lineHeight: 22 },
});
