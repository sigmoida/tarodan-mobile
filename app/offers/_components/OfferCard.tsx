import React from "react";
import { View, Pressable, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import type { TFunction } from "i18next";
import { theme, Avatar, Badge, Button, SectionCard, StatusBadge, Text } from "@/ui";
import { useOfferStatusConfig } from "@/lib/shared/offerStatus";
import { transformImageUrl } from "@/utils/imageUrl";
import type { Offer, TabType } from "../_lib/types";
import type { TimingMessageValues } from "@/lib/shared/timingPolicy";
import { isOfferAwaitingPayment, type AcceptAs } from "../_lib/accept";
import { FirstToPayNote } from "./FirstToPayNote";
import {
  getProductImage,
  getTimeRemaining,
  formatTimeAgo,
  formatPrice,
} from "../_lib/status";

const { colors, radius, spacing } = theme;

export interface OfferCardProps {
  offer: Offer;
  tab: TabType;
  estimatedNet?: number;
  isPending: boolean;
  t: TFunction;
  /** Politika süreleri (`useTimingValues()`); "ilk ödeyen alır" notu için. */
  timing: TimingMessageValues;
  /** Kabul ONAY ister (`useOfferActions.requestAccept`): `as` = kabulü kimin yaptığı. */
  onAccept: (id: string, as: AcceptAs) => void;
  /** Reddet / iptal de ONAY ister (`requestReject` / `requestCancel`). */
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onOpenCounter: (offer: Offer) => void;
  onOpenBuyerCounter: (offer: Offer) => void;
}

/**
 * Teklif kartı (web `OfferCard`): ürün · durum · tutar · karşı taraf · mesaj · tarih · durum-bazlı
 * aksiyonlar. SectionCard + Button; yükleniyorken düğme web gibi etiketini korur (spinner + kilit),
 * bekleme `isPending` ile gelir (teklif başına).
 */
function OfferCardBase({
  offer,
  tab,
  estimatedNet,
  isPending,
  t,
  timing,
  onAccept,
  onReject,
  onCancel,
  onOpenCounter,
  onOpenBuyerCounter,
}: OfferCardProps) {
  const statusConfig = useOfferStatusConfig();
  const otherUser = tab === "received" ? offer.buyer : offer.seller;
  const timeRemaining =
    offer.status === "pending" ? getTimeRemaining(offer.expiresAt, t) : null;
  const openProduct = () => router.push(`/product/${offer.product.id}` as any);
  const openOrder = () =>
    router.push({ pathname: "/orders/[id]", params: { id: offer.orderId! } } as any);

  return (
    <SectionCard bodyStyle={styles.body}>
      {/* Ürün + durum */}
      <View style={styles.row}>
        <Pressable onPress={openProduct} accessibilityRole="link">
          <Image source={{ uri: getProductImage(offer.product) }} style={styles.productImage} />
        </Pressable>
        <View style={styles.content}>
          <Pressable onPress={openProduct} accessibilityRole="link">
            <Text variant="body" weight="semibold" tone="heading" numberOfLines={2}>
              {offer.product.title}
            </Text>
          </Pressable>
          <Text variant="caption" tone="subtle">
            {t("offer.listingPrice")}:{" "}
            <Text variant="caption" tone="subtle" style={styles.strikethrough}>
              {formatPrice(offer.product.price)}
            </Text>
          </Text>
          <View style={styles.badges}>
            <StatusBadge status={offer.status} config={statusConfig} size="sm" />
            {tab === "sent" && offer.status === "pending" && offer.buyerMustAccept ? (
              <Badge variant="default" size="sm">
                {t("offer.counterFromSeller")}
              </Badge>
            ) : null}
          </View>
        </View>
      </View>

      {/* Tutar */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text variant="caption" tone="subtle">{t("offer.offerAmount")}</Text>
          <Text variant="h2" weight="bold" style={{ color: theme.priceColor.card }}>
            {formatPrice(offer.amount)}
          </Text>
        </View>

        {estimatedNet != null && (
          <View style={styles.netBox}>
            <Text variant="caption" tone="subtle">{t("offer.estimatedNetSeller")}</Text>
            <Text variant="body" weight="bold" tone="success">{formatPrice(estimatedNet)}</Text>
          </View>
        )}

        {timeRemaining && (
          <Text variant="bodySm" weight="medium" style={{ color: colors.warning[700]! }}>
            {t("offer.timeRemaining", { time: timeRemaining })}
          </Text>
        )}
      </View>

      {/* Karşı taraf */}
      {otherUser && (
        <View style={styles.userRow}>
          <Avatar
            source={otherUser.avatarUrl ? transformImageUrl(otherUser.avatarUrl) : undefined}
            name={otherUser.displayName}
            size="sm"
          />
          <View>
            <Text variant="caption" tone="subtle">
              {tab === "received" ? t("offer.offerer") : t("product.seller")}
            </Text>
            <Text variant="bodySm" weight="medium" tone="heading">{otherUser.displayName}</Text>
          </View>
        </View>
      )}

      {/* Mesaj */}
      {offer.message ? (
        <Text variant="bodySm" tone="muted" style={styles.message}>
          "{offer.message}"
        </Text>
      ) : null}

      {/* Tarih */}
      <Text variant="caption" tone="subtle">{formatTimeAgo(offer.createdAt, t)}</Text>

      {/* Aksiyonlar */}
      {offer.status === "pending" && (
        <View style={styles.actions}>
          {tab === "received" && offer.buyerMustAccept ? (
            <Text variant="bodySm" weight="medium" style={{ color: colors.warning[700]! }}>
              {t("offer.waitingForBuyerResponse")}
            </Text>
          ) : tab === "received" ? (
            <>
              <Button
                size="sm"
                variant="success"
                title={t("offer.acceptOffer")}
                onPress={() => onAccept(offer.id, "seller")}
                isLoading={isPending}
                disabled={isPending}
              />
              <Button
                size="sm"
                variant="danger"
                title={t("offer.rejectOffer")}
                onPress={() => onReject(offer.id)}
                disabled={isPending}
              />
              <Button
                size="sm"
                variant="outline"
                title={t("offer.counterOffer")}
                onPress={() => onOpenCounter(offer)}
                disabled={isPending}
              />
            </>
          ) : offer.buyerMustAccept ? (
            <>
              <Button
                size="sm"
                variant="success"
                title={t("offer.acceptCounterOffer")}
                onPress={() => onAccept(offer.id, "buyer")}
                isLoading={isPending}
                disabled={isPending}
              />
              <Button
                size="sm"
                variant="danger"
                title={t("offer.rejectOffer")}
                onPress={() => onReject(offer.id)}
                disabled={isPending}
              />
              <Button
                size="sm"
                variant="outline"
                title={t("offer.lowerOffer")}
                onPress={() => onOpenBuyerCounter(offer)}
                disabled={isPending}
              />
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              title={t("offer.cancelOffer")}
              onPress={() => onCancel(offer.id)}
              isLoading={isPending}
              disabled={isPending}
            />
          )}
        </View>
      )}

      {/* Kabul ürünü kilitlemez: ödenmemiş kabulde "ilk ödeyen alır" (web gibi). */}
      <FirstToPayNote offer={offer} isSeller={tab === "received"} timing={timing} />

      {/* Accepted → "Ödeme Yap" YALNIZ alıcıya (gönderilen sekmesi) ve ödeme bekliyorsa
          (web: `activeTab === "sent" && !paid`); satıcıya her durumda sipariş linki.
          Sipariş detayına git: /payment/[id] ÖDEME id'si ister (sunucu `payment.findUnique({ id })`);
          sipariş id'siyle "Ödeme bulunamadı" veriyordu. Detaydaki "Ödeme Yap" ödemeyi başlatıp
          (initiate) doğru ödeme id'siyle devam eder. */}
      {offer.status === "accepted" &&
        offer.orderId &&
        (tab === "sent" && isOfferAwaitingPayment(offer) ? (
          <Button
            size="sm"
            variant="primary"
            title={t("offer.payAmount", { amount: formatPrice(offer.amount) })}
            onPress={openOrder}
          />
        ) : (
          <Button size="sm" variant="outline" title={t("order.viewOrder")} onPress={openOrder} />
        ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing[3] },
  row: { flexDirection: "row", gap: spacing[3] },
  productImage: {
    width: spacing[20],
    height: spacing[20],
    borderRadius: radius.lg,
    backgroundColor: colors.gray[100]!,
  },
  content: { flex: 1, minWidth: 0, gap: spacing[1] },
  strikethrough: { textDecorationLine: "line-through" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" },
  amountRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[3] },
  amountBox: {
    backgroundColor: colors.primary[50]!,
    borderWidth: 1,
    borderColor: colors.primary[100]!,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  netBox: {
    backgroundColor: colors.success[50]!,
    borderWidth: 1,
    borderColor: colors.success[200]!,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  message: {
    backgroundColor: colors.surface.alt,
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
});

export const OfferCard = React.memo(OfferCardBase);
