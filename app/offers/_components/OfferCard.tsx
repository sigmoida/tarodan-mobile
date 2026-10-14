import React from "react";
import { View, Pressable, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import type { TFunction } from "i18next";
import { theme, Avatar, Badge, Button, ButtonRow, SectionCard, StatusBadge, Text } from "@/ui";
import { useOfferStatusConfig } from "@/lib/shared/offerStatus";
import { transformImageUrl } from "@/utils/imageUrl";
import type { Offer, TabType } from "../_lib/types";
import type { TimingMessageValues } from "@/lib/shared/timingPolicy";
import { isOfferAwaitingPayment, type AcceptAs } from "../_lib/accept";
import { FirstToPayNote } from "./FirstToPayNote";
import {
  getProductImage,
  getTimeRemaining,
  isExpiringSoon,
  formatTimeAgo,
  formatPrice,
} from "../_lib/status";

const { colors, spacing } = theme;

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
 * Teklif kartı — net hiyerarşi (yukarıdan aşağı):
 *  1. Üst satır: küçük görsel + başlık (2 satır) · durum rozeti sağ üstte.
 *  2. Fiyat satırı: teklif tutarı (fiyat rengi, belirgin) · "İlan fiyatı: X" (teklif düşükse üstü
 *     çizili). Satıcıya tahmini net ayrı satırda.
 *  3. Meta satırı: karşı taraf (avatar + ad, "Alıcı"/"Satıcı") · kalan süre çipi (< 6 sa uyarı
 *     tonu) · göreli tarih.
 *  4. Not: ince alıntı çizgisi, en çok 2 satır.
 *  5. Aksiyonlar: `ButtonRow` (eşit genişlik, etiket sarmaz; sığmazsa alt alta). Olumsuz aksiyon
 *     solda, olumlu sağda. Yükleniyorken düğme etiketini korur; bekleme `isPending` ile gelir
 *     (teklif başına).
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
  const isOpen = offer.status === "pending";
  const timeRemaining = isOpen ? getTimeRemaining(offer.expiresAt, t) : null;
  const expiringSoon = timeRemaining != null && isExpiringSoon(offer.expiresAt);
  const listingStruck = offer.amount < Number(offer.product.price);
  const openProduct = () => router.push(`/product/${offer.product.id}` as any);
  const openOrder = () =>
    router.push({ pathname: "/orders/[id]", params: { id: offer.orderId! } } as any);

  return (
    <SectionCard bodyStyle={styles.body} testID={`offer-card-${offer.id}`}>
      {/* 1 · Ürün + durum */}
      <View style={styles.topRow}>
        <Pressable onPress={openProduct} accessibilityRole="link">
          <Image source={{ uri: getProductImage(offer.product) }} style={styles.productImage} />
        </Pressable>
        <View style={styles.titleCol}>
          <Pressable onPress={openProduct} accessibilityRole="link">
            <Text variant="bodySm" weight="semibold" tone="heading" numberOfLines={2}>
              {offer.product.title}
            </Text>
          </Pressable>
          {tab === "sent" && isOpen && offer.buyerMustAccept ? (
            <Badge variant="default" size="xs" style={styles.selfStart}>
              {t("offer.counterFromSeller")}
            </Badge>
          ) : null}
        </View>
        <StatusBadge status={offer.status} config={statusConfig} size="sm" />
      </View>

      {/* 2 · Tutar: teklif · etiketli ilan fiyatı */}
      <View style={styles.priceBlock}>
        <View style={styles.priceRow}>
          <Text
            variant="h3"
            weight="bold"
            style={styles.amount}
            accessibilityLabel={`${t("offer.offerAmount")}: ${formatPrice(offer.amount)}`}
          >
            {formatPrice(offer.amount)}
          </Text>
          {/* İlan fiyatı etiketli; YALNIZ teklif ondan düşükse üstü çizili. İndirim yüzdesi
              gösterilmez: teklif yanıtındaki `product.price` TABAN fiyat (kampanya fiyatı yok),
              yüzde kampanyalı ilanda şişerdi. */}
          <Text variant="caption" tone="subtle" testID="offer-listing-price">
            {t("offer.listingPrice")}:{" "}
            <Text
              variant="caption"
              tone="subtle"
              style={listingStruck ? styles.strikethrough : undefined}
              testID={listingStruck ? "offer-listing-price-struck" : undefined}
            >
              {formatPrice(offer.product.price)}
            </Text>
          </Text>
        </View>
        {estimatedNet != null && (
          <Text variant="caption" tone="subtle">
            {t("offer.estimatedNetSeller")}:{" "}
            <Text variant="caption" weight="semibold" tone="success">
              {formatPrice(estimatedNet)}
            </Text>
          </Text>
        )}
      </View>

      {/* 3 · Karşı taraf · kalan süre · tarih */}
      <View style={styles.metaRow}>
        {otherUser ? (
          <View style={styles.userRow}>
            <Avatar
              source={otherUser.avatarUrl ? transformImageUrl(otherUser.avatarUrl) : undefined}
              name={otherUser.displayName}
              size="sm"
            />
            <View style={styles.userText}>
              <Text variant="caption" tone="subtle" numberOfLines={1}>
                {tab === "received" ? t("order.buyer") : t("product.seller")}
              </Text>
              <Text variant="bodySm" weight="medium" tone="heading" numberOfLines={1}>
                {otherUser.displayName}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.metaEnd}>
          {timeRemaining ? (
            <Badge
              variant={expiringSoon ? "warning" : "outline"}
              size="xs"
              testID={expiringSoon ? "offer-time-remaining-soon" : "offer-time-remaining"}
            >
              {t("offer.timeRemaining", { time: timeRemaining })}
            </Badge>
          ) : null}
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {formatTimeAgo(offer.createdAt, t)}
          </Text>
        </View>
      </View>

      {/* 4 · Not (ince alıntı) */}
      {offer.message ? (
        <View style={styles.quote} testID="offer-message">
          <Text variant="bodySm" tone="muted" numberOfLines={2}>
            {offer.message}
          </Text>
        </View>
      ) : null}

      {/* 5 · Aksiyonlar (olumsuz solda, olumlu sağda) */}
      {isOpen &&
        (tab === "received" && offer.buyerMustAccept ? (
          <Text variant="bodySm" weight="medium" style={styles.waiting}>
            {t("offer.waitingForBuyerResponse")}
          </Text>
        ) : tab === "received" ? (
          <ButtonRow testID="offer-actions">
            <Button
              key="reject"
              size="sm"
              variant="outline"
              title={t("offer.rejectOffer")}
              onPress={() => onReject(offer.id)}
              disabled={isPending}
            />
            <Button
              key="counter"
              size="sm"
              variant="secondary"
              title={t("offer.counterOffer")}
              onPress={() => onOpenCounter(offer)}
              disabled={isPending}
            />
            <Button
              key="accept"
              size="sm"
              variant="success"
              title={t("offer.acceptOffer")}
              onPress={() => onAccept(offer.id, "seller")}
              isLoading={isPending}
              disabled={isPending}
            />
          </ButtonRow>
        ) : offer.buyerMustAccept ? (
          <ButtonRow testID="offer-actions">
            <Button
              key="reject"
              size="sm"
              variant="outline"
              title={t("offer.rejectOffer")}
              onPress={() => onReject(offer.id)}
              disabled={isPending}
            />
            <Button
              key="lower"
              size="sm"
              variant="secondary"
              title={t("offer.lowerOffer")}
              onPress={() => onOpenBuyerCounter(offer)}
              disabled={isPending}
            />
            <Button
              key="accept"
              size="sm"
              variant="success"
              title={t("offer.acceptCounterOffer")}
              onPress={() => onAccept(offer.id, "buyer")}
              isLoading={isPending}
              disabled={isPending}
            />
          </ButtonRow>
        ) : (
          <ButtonRow testID="offer-actions">
            <Button
              key="cancel"
              size="sm"
              variant="outline"
              title={t("offer.cancelOffer")}
              onPress={() => onCancel(offer.id)}
              isLoading={isPending}
              disabled={isPending}
            />
          </ButtonRow>
        ))}

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

/** Küçük görsel: 64pt (web liste satırı küçük görseli). */
const THUMB = spacing[16];

const styles = StyleSheet.create({
  body: { gap: spacing[3] },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  productImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radiusRole.productCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.gray[100]!,
  },
  titleCol: { flex: 1, minWidth: 0, gap: spacing[1] },
  selfStart: { alignSelf: "flex-start" },
  priceBlock: { gap: spacing[0.5] },
  priceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing[2],
    rowGap: spacing[1],
  },
  amount: { color: theme.priceColor.card },
  strikethrough: { textDecorationLine: "line-through" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  userRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing[2] },
  userText: { flex: 1, minWidth: 0 },
  metaEnd: { marginLeft: "auto", alignItems: "flex-end", gap: spacing[1] },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border.DEFAULT,
    paddingLeft: spacing[2],
  },
  waiting: { color: colors.warning[700]! },
});

export const OfferCard = React.memo(OfferCardBase);
