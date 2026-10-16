import React from "react";
import { View } from "react-native";
import { EmptyState, IconButton, SectionCard, Text, appAlert, toast } from "@/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AuthGatePage } from "@/components/common/AuthGatePage";
import { PageShell } from "@/components/common/PageShell";
import { RowListSkeleton } from "@/components/common/RowListSkeleton";
import { useAuthStore } from "@/stores/authStore";
import { useRefresh } from "@/hooks/useRefresh";
import { membershipApi, type SavedCard } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/errorText";
import { useSavedCards } from "@/lib/payment/useSavedCards";
import { qk } from "@/lib/query";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";
import { styles } from './_lib/styles';
import { SavedCardBadges } from './_components/SavedCardBadges';

/**
 * Kayıtlı Kartlarım (mobil) — web profile/payment-methods paritesi.
 * Kart EKLEME ödeme sırasında ("kartımı kaydet") olur; burada listele + sil.
 * PAN/CVV asla gösterilmez/saklanmaz. Liste amaçsız istenir (iki mağazanın
 * kartları birlikte, web gibi); rozetler web `SavedCardCard` ile aynı.
 * PageShell + tek SectionCard; kart satırı başı ikonu yok.
 */

const buildCardTypeLabels = (t: TFunction): Record<string, string> => ({
  credit: t("payment.cardTypeCredit"),
  debit: t("payment.cardTypeDebit"),
});

export default function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const cardTypeLabels = buildCardTypeLabels(t);
  const title = t("payment.savedCardsTitle");

  // Amaçsız: iki mağazanın kartları birlikte (web gibi).
  const cardsQuery = useSavedCards({ enabled: isAuthenticated });
  // Çekip-yenile göstergesi yalnız kullanıcı çektiğinde (`isFetching` kart silme sonrası
  // invalidate'te de dönüyordu).
  const { refreshing, onRefresh } = useRefresh(cardsQuery.refetch);

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
              // Prefix: ödeme formunun amaçlı listeleri de tazelenir.
              queryClient.invalidateQueries({ queryKey: qk.payments.savedCardsAll });
            } catch (e: any) {
              toast.error(apiErrorMessage(e, t("payment.deleteCardFailed")));
            }
          },
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return <AuthGatePage title={title} icon="credit-card" subtitle={t("auth.loginToContinue")} />;
  }

  const cards = cardsQuery.data ?? [];

  return (
    <PageShell
      title={title}
      refreshing={refreshing}
      onRefresh={onRefresh}
      loading={cardsQuery.isLoading}
      loadingFallback={<RowListSkeleton rows={3} />}
      // Liste alınamadı → "kayıtlı kart yok" değil, ErrorState + yeniden dene.
      error={(cardsQuery.isError && !cardsQuery.data) || undefined}
      onRetry={() => cardsQuery.refetch()}
    >
      <Text variant="bodySm" tone="muted">
        {/* Dijital satış kapalıyken (iOS + Android) abonelik satılmıyor (Apple 2.1(b) / Play): oto-yenileme ifadesi yok. */}
        {t(CAN_BUY_DIGITAL ? "payment.savedCardsIntro" : "payment.savedCardsIntroNeutral")}
      </Text>

      {cards.length === 0 ? (
        <EmptyState
          icon="credit-card"
          title={t("payment.noSavedCardsTitle")}
          subtitle={t("payment.noSavedCardsSubtitle")}
        />
      ) : (
        <SectionCard bodyStyle={styles.list}>
          {cards.map((c) => (
            <View key={c.id} style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text variant="label">
                  {(c.brand || t("payment.cardGenericBrand")) + " •••• " + c.last4}
                </Text>
                <SavedCardBadges card={c} />
                {[c.bank, c.cardType ? cardTypeLabels[c.cardType] : null].filter(Boolean).length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {[c.bank, c.cardType ? cardTypeLabels[c.cardType] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
                {c.expMonth && c.expYear ? (
                  <Text variant="caption" tone="muted">
                    {t("payment.expiryLabel", { month: c.expMonth, year: c.expYear })}
                  </Text>
                ) : null}
              </View>
              <IconButton
                testID={`card-delete-${c.id}`}
                icon="trash"
                variant="danger"
                size="sm"
                accessibilityLabel={t("common.delete")}
                onPress={() => handleDelete(c)}
              />
            </View>
          ))}
        </SectionCard>
      )}

      <Text variant="caption" tone="muted" style={styles.secureText}>
        {t("payment.cardsVaultNotice")}
      </Text>
    </PageShell>
  );
}
