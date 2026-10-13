import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme, RawText } from "@/ui";
import type { TimingMessageValues } from "@/lib/shared/timingPolicy";
import { showFirstToPayNote } from "../_lib/accept";

const { colors, spacing } = theme;

/**
 * Kabul edilmiş, ödenmemiş teklifte "ürünü ilk ödeyen alır" notu (web `OfferCard`).
 * Satıcıya ödeme süresiyle (`timing` = `useTimingValues()`, ekran geçirir), alıcıya
 * "ürün henüz size ayrılmadı" diye. Self-gates; kendi hook'u yok.
 */
export function FirstToPayNote({
  offer,
  isSeller,
  timing,
}: {
  offer: { status?: string; orderStatus?: string | null };
  isSeller: boolean;
  timing: TimingMessageValues;
}) {
  const { t } = useTranslation();
  if (!showFirstToPayNote(offer)) return null;

  return (
    <View style={styles.box} testID="first-to-pay-note">
      <Ionicons name="warning-outline" size={18} color={colors.warning[600]!} />
      <RawText style={styles.text}>
        {isSeller ? t("offer.firstToPayWinsSeller", timing) : t("offer.firstToPayWinsBuyer")}
      </RawText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    backgroundColor: colors.warning[50],
    borderRadius: theme.radius.lg,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  text: { flex: 1, fontSize: 13, color: colors.warning[700] },
});
