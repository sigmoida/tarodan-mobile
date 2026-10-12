import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { Card, Spinner, Text, theme, appAlert } from "@/ui";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ScreenHeader, EmptyState } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import { membershipApi, type SavedCard } from "@/lib/api";
import { qk } from "@/lib/query";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";
import { styles } from './_payment-methods/_lib/styles';
import { SavedCardBadges } from './_payment-methods/_components/SavedCardBadges';

const { colors } = theme;

/**
 * Kayıtlı Kartlarım (mobil) — web profile/payment-methods paritesi.
 * Kart EKLEME ödeme sırasında ("kartımı kaydet") olur; burada listele + sil.
 * PAN/CVV asla gösterilmez/saklanmaz. Liste amaçsız istenir (iki mağazanın
 * kartları birlikte); her kartın mağazası rozetle gösterilir (API delta 20).
 */

const buildCardTypeLabels = (t: TFunction): Record<string, string> => ({
  credit: t("payment.cardTypeCredit"),
  debit: t("payment.cardTypeDebit"),
});

export default function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const cardTypeLabels = buildCardTypeLabels(t);

  const cardsQuery = useQuery({
    queryKey: qk.payments.savedCards,
    queryFn: async () => {
      const res = await membershipApi.listCards();
      const data: any = res.data;
      const list: SavedCard[] = Array.isArray(data) ? data : (data?.data ?? []);
      return list;
    },
    enabled: isAuthenticated,
  });

  const handleDelete = (card: SavedCard) => {
    appAlert(
      t("payment.deleteCardTitle"),
      t(CAN_BUY_DIGITAL ? "payment.deleteCardBody" : "payment.deleteCardBodyNeutral", { brand: card.brand || t("payment.cardGenericBrand"), last4: card.last4 }),
      [
        { text: t("payment.threeDSCancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await membershipApi.deleteCard(card.id);
              // Sunucu 200 döndüğü an listeyi tazele — PayTR tarafındaki
              // temizliğin bitmesini BEKLEME (kart kaydı bizde zaten silindi).
              queryClient.invalidateQueries({ queryKey: qk.payments.savedCards });
            } catch (e: any) {
              appAlert(
                t("common.error"),
                e?.response?.data?.message || t("payment.deleteCardFailed"),
              );
            }
          },
        },
      ],
    );
  };

  const cards = cardsQuery.data ?? [];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("payment.savedCardsTitle")} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={cardsQuery.isFetching}
            onRefresh={() => cardsQuery.refetch()}
          />
        }
      >
        <Text variant="body" tone="muted" style={styles.intro}>
          {/* Dijital satış kapalıyken (iOS + Android) abonelik satılmıyor (Apple 2.1(b) / Play): oto-yenileme ifadesi yok. */}
          {t(CAN_BUY_DIGITAL ? "payment.savedCardsIntro" : "payment.savedCardsIntroNeutral")}
        </Text>

        {cardsQuery.isLoading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title={t("payment.noSavedCardsTitle")}
            subtitle={t("payment.noSavedCardsSubtitle")}
          />
        ) : (
          cards.map((c) => (
            <Card key={c.id} style={styles.cardRow}>
              <Ionicons name="card" size={28} color={colors.primary[500]} />
              <View style={styles.cardInfo}>
                <Text variant="body" style={styles.cardTitle}>
                  {(c.brand || t("payment.cardGenericBrand")) + " •••• " + c.last4}
                </Text>
                <SavedCardBadges card={c} />
                {[
                  c.bank,
                  c.cardType ? cardTypeLabels[c.cardType] : null,
                ].filter(Boolean).length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {[c.bank, c.cardType ? cardTypeLabels[c.cardType] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
                {c.expMonth && c.expYear ? (
                  <Text
                    variant="caption"
                    tone="muted"
                  >{t("payment.expiryLabel", { month: c.expMonth, year: c.expYear })}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleDelete(c)}
                hitSlop={10}
                style={styles.delete}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.danger[500]}
                />
              </Pressable>
            </Card>
          ))
        )}

        <View style={styles.secure}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={colors.success[600]}
          />
          <Text variant="caption" tone="muted" style={styles.secureText}>
            {t("payment.cardsVaultNotice")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

