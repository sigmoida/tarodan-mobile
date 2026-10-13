import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";
import { theme, StatusBadge, RawText } from "@/ui";
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

const { colors } = theme;

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

  return (
    <View style={styles.card}>
      {/* Top row: image + info */}
      <View style={styles.cardRow}>
        <TouchableOpacity
          onPress={() => router.push(`/product/${offer.product.id}` as any)}
        >
          <Image
            source={{ uri: getProductImage(offer.product) }}
            style={styles.productImage}
          />
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <TouchableOpacity
            onPress={() => router.push(`/product/${offer.product.id}` as any)}
          >
            <RawText style={styles.productTitle} numberOfLines={2}>
              {offer.product.title}
            </RawText>
          </TouchableOpacity>

          <RawText style={styles.originalPrice}>
            {t("offer.listingPrice")}:{" "}
            <RawText style={styles.strikethrough}>
              {formatPrice(offer.product.price)}
            </RawText>
          </RawText>

          <View style={styles.statusBadge}>
            <StatusBadge status={offer.status} config={statusConfig} size="sm" />
          </View>

          {tab === "sent" &&
          offer.status === "pending" &&
          offer.buyerMustAccept ? (
            <View style={styles.counterAlertBadge}>
              <Ionicons name="swap-horizontal" size={14} color={colors.white} />
              <RawText style={styles.counterAlertText}>
                {t("offer.counterFromSeller")}
              </RawText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Offer amount */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <RawText style={styles.amountLabel}>{t("offer.offerAmount")}</RawText>
          <RawText style={styles.amountValue}>{formatPrice(offer.amount)}</RawText>
        </View>

        {estimatedNet != null && (
          <View style={styles.netBox}>
            <RawText style={styles.netLabel}>{t("offer.estimatedNetSeller")}</RawText>
            <RawText style={styles.netValue}>{formatPrice(estimatedNet)}</RawText>
          </View>
        )}

        {timeRemaining && (
          <View style={styles.timeBox}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.warning[600]!}
            />
            <RawText style={styles.timeText}>
              {t("offer.timeRemaining", { time: timeRemaining })}
            </RawText>
          </View>
        )}
      </View>

      {/* Other user */}
      {otherUser && (
        <View style={styles.userRow}>
          {otherUser.avatarUrl ? (
            <Image
              source={{ uri: transformImageUrl(otherUser.avatarUrl) }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={16} color={colors.text.subtle} />
            </View>
          )}
          <View>
            <RawText style={styles.userLabel}>
              {tab === "received" ? t("offer.offerer") : t("product.seller")}
            </RawText>
            <RawText style={styles.userName}>{otherUser.displayName}</RawText>
          </View>
        </View>
      )}

      {/* Message */}
      {offer.message ? (
        <View style={styles.messageBox}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={colors.text.subtle}
            style={{ marginTop: theme.spacing[0.5] }}
          />
          <RawText style={styles.messageText}>"{offer.message}"</RawText>
        </View>
      ) : null}

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons
          name="calendar-outline"
          size={14}
          color={colors.text.subtle}
        />
        <RawText style={styles.dateText}>{formatTimeAgo(offer.createdAt, t)}</RawText>
      </View>

      {/* Actions */}
      {offer.status === "pending" && (
        <View style={styles.actionsRow}>
          {tab === "received" && offer.buyerMustAccept ? (
            <View style={styles.waitingBanner}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.warning[700]!}
              />
              <RawText style={styles.waitingBannerText}>
                {t("offer.waitingForBuyerResponse")}
              </RawText>
            </View>
          ) : tab === "received" ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => onAccept(offer.id, "seller")}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <RawText style={styles.actionBtnText}>{t("offer.acceptOffer")}</RawText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => onReject(offer.id)}
                disabled={isPending}
              >
                <Ionicons name="close" size={16} color={colors.white} />
                <RawText style={styles.actionBtnText}>{t("offer.rejectOffer")}</RawText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.counterBtn]}
                onPress={() => onOpenCounter(offer)}
                disabled={isPending}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={16}
                  color={colors.white}
                />
                <RawText style={styles.actionBtnText}>{t("offer.counterOffer")}</RawText>
              </TouchableOpacity>
            </>
          ) : offer.buyerMustAccept ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => onAccept(offer.id, "buyer")}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <RawText style={styles.actionBtnText}>
                      {t("offer.acceptCounterOffer")}
                    </RawText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => onReject(offer.id)}
                disabled={isPending}
              >
                <Ionicons name="close" size={16} color={colors.white} />
                <RawText style={styles.actionBtnText}>{t("offer.rejectOffer")}</RawText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.counterBtn]}
                onPress={() => onOpenBuyerCounter(offer)}
                disabled={isPending}
              >
                <Ionicons name="trending-down" size={16} color={colors.white} />
                <RawText style={styles.actionBtnText}>{t("offer.lowerOffer")}</RawText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => onCancel(offer.id)}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="close" size={16} color={colors.white} />
                  <RawText style={styles.actionBtnText}>{t("offer.cancelOffer")}</RawText>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Kabul ürünü kilitlemez: ödenmemiş kabulde "ilk ödeyen alır" (web gibi). */}
      <FirstToPayNote offer={offer} isSeller={tab === "received"} timing={timing} />

      {/* Accepted → "Ödeme Yap" YALNIZ alıcıya (gönderilen sekmesi) ve ödeme bekliyorsa
          (web: `activeTab === "sent" && !paid`); satıcıya her durumda sipariş linki. */}
      {offer.status === "accepted" &&
        offer.orderId &&
        (tab === "sent" && isOfferAwaitingPayment(offer) ? (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.payBtn,
              { alignSelf: "flex-start", marginTop: theme.spacing[3] },
            ]}
            // Sipariş detayına git: /payment/[id] ÖDEME id'si ister (sunucu
            // `payment.findUnique({ id })`); sipariş id'siyle "Ödeme bulunamadı"
            // veriyordu. Detaydaki "Ödeme Yap" ödemeyi başlatıp (initiate)
            // doğru ödeme id'siyle devam eder.
            onPress={() =>
              router.push({
                pathname: "/orders/[id]",
                params: { id: offer.orderId! },
              } as any)
            }
          >
            <Ionicons name="card-outline" size={16} color={colors.white} />
            <RawText style={styles.actionBtnText}>
              {t("offer.payAmount", { amount: formatPrice(offer.amount) })}
            </RawText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.orderBtn,
              { alignSelf: "flex-start", marginTop: theme.spacing[3] },
            ]}
            onPress={() =>
              router.push({
                pathname: "/orders/[id]",
                params: { id: offer.orderId! },
              } as any)
            }
          >
            <Ionicons name="cube-outline" size={16} color={colors.white} />
            <RawText style={styles.actionBtnText}>{t("order.viewOrder")}</RawText>
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 12,
    padding: theme.spacing[3.5],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  cardRow: { flexDirection: "row", gap: theme.spacing[3] },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.xl,
    backgroundColor: colors.gray[100]!,
  },
  cardContent: { flex: 1, gap: theme.spacing[1] },
  productTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
    lineHeight: 20,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.text.subtle,
    marginTop: theme.spacing[0.5],
  },
  strikethrough: { textDecorationLine: "line-through" },

  statusBadge: {
    alignSelf: "flex-start",
    marginTop: theme.spacing[1],
  },
  counterAlertBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing[1.5],
    backgroundColor: colors.info[600]!,
  },
  counterAlertText: { fontSize: 11, fontWeight: "700", color: colors.white },

  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing[2.5],
    marginTop: theme.spacing[3],
  },
  amountBox: {
    backgroundColor: colors.primary[50]!,
    borderWidth: 1,
    borderColor: colors.primary[100]!,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  amountLabel: {
    fontSize: 10,
    color: colors.text.subtle,
    marginBottom: theme.spacing[0.5],
  },
  amountValue: { fontSize: 20, fontWeight: "700", color: colors.primary[600]! },
  netBox: {
    backgroundColor: colors.success[100]!,
    borderWidth: 1,
    borderColor: colors.success[300]!,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    flex: 1,
    minWidth: 0,
  },
  netLabel: {
    fontSize: 10,
    color: colors.text.subtle,
    marginBottom: theme.spacing[0.5],
  },
  netValue: { fontSize: 16, fontWeight: "700", color: colors.success[600]! },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    backgroundColor: colors.warning[100]!,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radius.xl,
  },
  timeText: { fontSize: 12, fontWeight: "600", color: colors.warning[600]! },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: theme.radius["3xl"],
    backgroundColor: colors.gray[100]!,
  },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  userLabel: { fontSize: 10, color: colors.text.subtle },
  userName: { fontSize: 13, fontWeight: "600", color: colors.text.heading },

  messageBox: {
    flexDirection: "row",
    gap: theme.spacing[1.5],
    backgroundColor: colors.surface.alt,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[2.5],
    marginTop: theme.spacing[2.5],
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: "italic",
    lineHeight: 18,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
    marginTop: theme.spacing[2.5],
    paddingTop: theme.spacing[2.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  dateText: { fontSize: 12, color: colors.text.subtle },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flex: 1,
    minWidth: "100%",
    backgroundColor: colors.warning[100]!,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    borderRadius: theme.radius.xl,
  },
  waitingBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning[800]!,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: 9,
    borderRadius: theme.radius.xl,
  },
  actionBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  acceptBtn: { backgroundColor: colors.success[600]! },
  rejectBtn: { backgroundColor: colors.danger[600]! },
  counterBtn: { backgroundColor: colors.info[600]! },
  cancelBtn: { backgroundColor: colors.gray[500]! },
  orderBtn: { backgroundColor: colors.primary[600]! },
  payBtn: { backgroundColor: colors.success[600]! },
});

export const OfferCard = React.memo(OfferCardBase);
