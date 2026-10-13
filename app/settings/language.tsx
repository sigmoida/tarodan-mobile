import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { type Locale } from "@/i18n/lib";
import { SectionCard, Text, theme } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useLocale, localeNames } from "@/i18n/LocaleProvider";

const { colors, spacing, minTouchTarget, iconSize } = theme;

const OPTIONS: Locale[] = ["tr", "en"];

/** Dil ayarı — PageShell + tek SectionCard; seçili dilde işlevsel onay işareti. */
export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  const handleSelect = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  return (
    <PageShell title={t("language.language")}>
      <Text variant="bodySm" tone="muted">
        {t("language.languageInfo")}
      </Text>
      <SectionCard bodyStyle={styles.list}>
        {OPTIONS.map((l) => (
          <Pressable
            key={l}
            accessibilityRole="radio"
            accessibilityState={{ selected: locale === l }}
            style={[styles.row, locale === l && styles.rowActive]}
            onPress={() => handleSelect(l)}
          >
            <Text
              variant="body"
              weight={locale === l ? "semibold" : "regular"}
              tone={locale === l ? "primary" : "heading"}
              style={styles.name}
            >
              {localeNames[l]}
            </Text>
            {locale === l ? (
              <Ionicons name="checkmark" size={iconSize.lg} color={colors.primary[600]!} />
            ) : null}
          </Pressable>
        ))}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[2] },
  row: {
    minHeight: minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: theme.radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowActive: {
    borderColor: colors.primary[500]!,
    backgroundColor: colors.primary[50]!,
  },
  name: { flex: 1 },
});
