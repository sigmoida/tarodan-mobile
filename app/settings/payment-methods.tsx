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

const CARD_TYPE_LABELS: Record<string, string> = {
  credit: "Kredi kartı",
  debit: "Banka kartı",
};

export default function PaymentMethodsScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

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
      "Kartı sil",
      `${card.brand || "Kart"} •••• ${card.last4} kartını silmek istediğine emin misin? Bu kartla otomatik yenileme yapılamaz hale gelir.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await membershipApi.deleteCard(card.id);
              // Sunucu 200 döndüğü an listeyi tazele — PayTR tarafındaki
              // temizliğin bitmesini BEKLEME (kart kaydı bizde zaten silindi).
              queryClient.invalidateQueries({ queryKey: qk.payments.savedCards });
            } catch (e: any) {
              appAlert(
                "Hata",
                e?.response?.data?.message || "Kart silinemedi.",
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
      <ScreenHeader title="Kayıtlı Kartlarım" />
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
          Otomatik yenileme ve hızlı ödeme için kayıtlı kartların. Yeni kart,
          ödeme sırasında "kartımı kaydet" ile eklenir.
        </Text>

        {cardsQuery.isLoading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Kayıtlı kartın yok"
            subtitle='Bir ödeme yaparken "kartımı kaydet" seçeneğini işaretleyerek kart ekleyebilirsin.'
          />
        ) : (
          cards.map((c) => (
            <Card key={c.id} style={styles.cardRow}>
              <Ionicons name="card" size={28} color={colors.primary[500]} />
              <View style={styles.cardInfo}>
                <Text variant="body" style={styles.cardTitle}>
                  {(c.brand || "Kart") + " •••• " + c.last4}
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
                      Varsayılan
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
                      Oto-yenilemeye uygun
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
                      CVV gerektirir
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
                      Kurumsal
                    </Text>
                  )}
                </View>
                {[
                  c.bank,
                  c.cardType ? CARD_TYPE_LABELS[c.cardType] : null,
                ].filter(Boolean).length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {[c.bank, c.cardType ? CARD_TYPE_LABELS[c.cardType] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
                {c.expMonth && c.expYear ? (
                  <Text
                    variant="caption"
                    tone="muted"
                  >{`Son kullanma: ${c.expMonth}/${c.expYear}`}</Text>
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
            Kartların PayTR güvenli kasasında saklanır; numara/CVV bizde
            tutulmaz.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

