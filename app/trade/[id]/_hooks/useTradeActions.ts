import { useState } from "react";
import { router } from "expo-router";
import { appAlert, toast } from "@/ui";
import { tradesApi, paymentsApi } from "@/lib/api";
import { qk, useAppMutation } from "@/lib/query";
import { useTranslation } from "react-i18next";
import { captureException } from "@/services/sentry";
import { useRequireLegalIdentityFor } from "@/hooks/useLegalIdentity";

/**
 * Takas detay controller'ı: 5 mutation (kabul/reddet/onayla/nakit-öde/iptal)
 * + reddet modalının UI durumu + teslimat adresi. Geri bildirim
 * (`toast.success` / `toast.error` + invalidate) `useAppMutation`'dadır.
 * İtiraz ayrı form ekranı (`../dispute.tsx`); burada yalnız ona geçiş var.
 *
 * Modal kuralı (CLAUDE.md §12): reddet modalı ÖNCE kapanır, mutation SONRA
 * başlar — modal `isPending` beklemez. Sonuç toast'ı kapalı modalın üstünde görünür.
 */
export function useTradeActions(id: string) {
  const { t } = useTranslation();
  // Aksiyon başına hedef: kabul kontrol edilirken nakit ödeme yükleniyor
  // görünmesin (ve tersi).
  const { requireIdentityFor, checkingTarget } =
    useRequireLegalIdentityFor<"accept" | "cashPay">();

  const [tradeAddressId, setTradeAddressId] = useState<string | null>(null);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Kabul/reddet/iptal: detay + tüm takas listeleri; onayla yalnız detay.
  const detailAndLists = [qk.trades.detail(id), qk.trades.all] as const;

  const acceptMutation = useAppMutation(
    () => tradesApi.accept(id, undefined, tradeAddressId ?? undefined),
    {
      invalidates: detailAndLists,
      success: () => t("trade.accept.successMessage"),
      error: () => t("common.operationFailed"),
      onError: (error) =>
        captureException(error, {
          level: "error",
          tags: { flow: "trade.accept" },
          extra: { tradeId: id },
        }),
    },
  );

  const rejectMutation = useAppMutation(
    (reason: string | undefined) => tradesApi.reject(id, reason),
    {
      invalidates: detailAndLists,
      success: () => t("trade.tradeRejected"),
      error: () => t("common.operationFailed"),
      onSuccess: () => setRejectReason(""),
    },
  );

  const confirmMutation = useAppMutation(() => tradesApi.confirmReceipt(id), {
    invalidates: [qk.trades.detail(id)],
    success: () => t("trade.confirmReceipt.successMessage"),
    error: () => t("common.operationFailed"),
  });

  const cashPayMutation = useAppMutation(() => paymentsApi.initiateTradeCash(id), {
    error: () => t("payment.startFailed"),
    onSuccess: (response: any) => {
      const data = response?.data?.data ?? response?.data ?? {};
      const paymentId = data.paymentId ?? data.id;
      if (!paymentId) {
        toast.error(t("trade.cashPay.missingPaymentId"));
        return;
      }
      const paymentUrl: string | undefined = data.paymentUrl;
      router.push({
        pathname: "/payment/[id]",
        params: {
          id: paymentId,
          provider: "paytr",
          tradeCash: "1",
          tradeId: String(id),
          ...(paymentUrl ? { paymentUrl } : {}),
        },
      } as any);
    },
    onError: (error) =>
      captureException(error, {
        level: "error",
        tags: { flow: "trade.cashPay" },
        extra: { tradeId: id },
      }),
  });

  const cancelMutation = useAppMutation(
    () => tradesApi.cancel(id, t("trade.cancelledByUser")),
    {
      invalidates: detailAndLists,
      success: () => t("trade.tradeCancelled"),
      error: () => t("common.operationFailed"),
    },
  );

  // --- Handler'lar (aksiyon butonlarından) ---
  const handleAccept = async () => {
    if (!tradeAddressId) {
      appAlert(
        t("address.deliveryAddress"),
        t("trade.selectDeliveryAddress"),
      );
      return;
    }
    // B4: kabul takası başlatır — önce yasal kimlik. Kapı onay penceresinden
    // ÖNCE: `appAlert` kapanırken native kapı açılırsa iOS donar; kapı kendi
    // kapanışını bekleyip çözüldüğü için onay güvenle açılır.
    if (!(await requireIdentityFor("accept"))) return;
    appAlert(
      t("trade.accept.confirmTitle"),
      t("trade.accept.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("trade.acceptTrade"), onPress: () => acceptMutation.mutate() },
      ],
    );
  };

  const handleCancel = () => {
    appAlert(
      t("trade.cancel.tradeCta"),
      t("trade.cancel.confirmMessage"),
      [
        { text: t("trade.dispute.cancelCta"), style: "cancel" },
        {
          text: t("trade.cancelTradeAction"),
          style: "destructive",
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  };

  const submitReject = () => {
    setRejectVisible(false); // §12: önce kapat, sonra gönder.
    rejectMutation.mutate(rejectReason.trim() || undefined);
  };

  return {
    // teslimat adresi
    setTradeAddressId,
    // reddet modal
    reject: {
      visible: rejectVisible,
      open: () => setRejectVisible(true),
      close: () => setRejectVisible(false),
      reason: rejectReason,
      setReason: setRejectReason,
      submit: submitReject,
    },
    // itiraz — ayrı form ekranı (taslak, doğrulama ve mutasyon orada)
    openDispute: () =>
      router.push({ pathname: "/trade/[id]/dispute", params: { id } } as never),
    // aksiyonlar
    handleAccept,
    handleCancel,
    acceptPending: checkingTarget === "accept" || acceptMutation.isPending,
    cancelPending: cancelMutation.isPending,
    confirm: () => confirmMutation.mutate(),
    confirmPending: confirmMutation.isPending,
    // B-2.4: nakit ödeme başlamadan yasal kimlik; vazgeçerse ödeme başlamaz.
    cashPay: async () => {
      if (!(await requireIdentityFor("cashPay"))) return;
      cashPayMutation.mutate();
    },
    cashPayPending: checkingTarget === "cashPay" || cashPayMutation.isPending,
    rejectPending: rejectMutation.isPending,
  };
}
