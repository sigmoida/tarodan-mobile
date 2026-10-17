import React from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/ui";
import type { TimingMessageValues } from "@/lib/shared/timingPolicy";
import { showFirstToPayNote } from "../_lib/accept";

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
    <Alert variant="warning" testID="first-to-pay-note">
      {isSeller ? t("offer.firstToPayWinsSeller", timing) : t("offer.firstToPayWinsBuyer")}
    </Alert>
  );
}
