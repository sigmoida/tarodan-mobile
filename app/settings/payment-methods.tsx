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
import { membershipApi } from "@/lib/api";
import { qk } from "@/lib/query";
import { styles } from './_payment-methods/_lib/styles';

const { colors } = theme;

/**
 * Kayıtlı Kartlarım (mobil) — web profile/payment-methods paritesi.
 * Kart EKLEME ödeme sırasında ("kartımı kaydet") olur; burada listele + sil.
 * PAN/CVV asla gösterilmez/saklanmaz.
 */

interface SavedCard {
  id: string;
  last4: string;
  brand: string | null;
  bank: string | null;
  cardType: string | null;
  cardScheme: string | null;
  businessCard: boolean | null;
  expMonth: string | null;
  expYear: string | null;
  requireCvv: boolean;
  isDefault: boolean;
  autoRenewEligible: boolean;
}

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
      t("payment.deleteCardBody", { brand: card.brand || t("payment.cardGenericBrand"), last4: card.last4 }),
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
          {t("payment.savedCardsIntro")}
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
                <View style={styles.badges}>
                  {c.cardScheme && (
                    <Text
                      variant="caption"
                      style={[
                        styles.badge,
                        {
                          backgroundColor: colors.surface.alt,
                          color: colors.text.muted,
                        },
                      ]}
                    >
                      {c.cardScheme.toUpperCase()}
                    </Text>
                  )}
                  {c.isDefault && (
                    <Text
                      variant="caption"
                      style={[
                        styles.badge,
                        {
                          backgroundColor: colors.primary[50],
                          color: colors.primary[700],
                        },
                      ]}
                    >
                      {t("payment.defaultCard")}
                    </Text>
                  )}
                  {c.autoRenewEligible ? (
                    <Text
                      variant="caption"
                      style={[
                        styles.badge,
                        {
                          backgroundColor: colors.success[50],
                          color: colors.success[600],
                        },
                      ]}
                    >
                      {t("payment.autoRenewEligibleBadge")}
                    </Text>
                  ) : (
                    <Text
                      variant="caption"
                      style={[
                        styles.badge,
                        {
                          backgroundColor: colors.warning[50],
                          color: colors.warning[600],
                        },
                      ]}
                    >
                      {t("payment.cvvRequiredBadge")}
                    </Text>
                  )}
                  {c.businessCard && (
                    <Text
                      variant="caption"
                      style={[
                        styles.badge,
                        {
                          backgroundColor: colors.info[50],
                          color: colors.info[600],
                        },
                      ]}
                    >
                      {t("footer.corporate")}
                    </Text>
                  )}
                </View>
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

