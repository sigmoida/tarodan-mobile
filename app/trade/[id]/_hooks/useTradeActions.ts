import { useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appAlert } from "@/ui";
import { tradesApi, paymentsApi } from "@/lib/api";
import { qk } from "@/lib/query";
import { useTranslation } from "react-i18next";
import { captureException } from "@/services/sentry";

type DisputeReason =
  "shipment_lost" | "shipment_damaged" | "wrong_item" | "other";

/**
 * Takas detay controller'ı: 6 mutation (kabul/reddet/onayla/nakit-öde/iptal/itiraz)
 * + snackbar + iki modalın (reddet/itiraz) UI durumu + teslimat adresi. Tüm iş
 * mantığı ekrandan buraya taşındı; index yalnız kompozisyon yapar.
 */
export function useTradeActions(id: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });
  const notify = (message: string) => setSnackbar({ visible: true, message });
  const dismissSnackbar = () => setSnackbar((s) => ({ ...s, visible: false }));

  const [tradeAddressId, setTradeAddressId] = useState<string | null>(null);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [disputeReason, setDisputeReason] =
    useState<DisputeReason>("shipment_lost");
  const [disputeDescription, setDisputeDescription] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.trades.detail(id) });
    queryClient.invalidateQueries({ queryKey: qk.trades.all });
  };

  const acceptMutation = useMutation({
    mutationFn: () =>
      tradesApi.accept(id, undefined, tradeAddressId ?? undefined),
    onSuccess: () => {
      invalidate();
      notify(t("trade.accept.successMessage"));
    },
    onError: (error: any) => {
      captureException(error, {
        level: "error",
        tags: { flow: "trade.accept" },
        extra: { tradeId: id },
      });
      notify(error.response?.data?.message || t("common.operationFailed"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => tradesApi.reject(id, rejectReason.trim() || undefined),
    onSuccess: () => {
      invalidate();
      setRejectVisible(false);
      setRejectReason("");
      notify(t("trade.tradeRejected"));
    },
    onError: (error: any) =>
      notify(error.response?.data?.message || t("common.operationFailed")),
  });

  const confirmMutation = useMutation({
    mutationFn: () => tradesApi.confirmReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.trades.detail(id) });
      notify(t("trade.confirmReceipt.successMessage"));
    },
    onError: (error: any) =>
      notify(error.response?.data?.message || t("common.operationFailed")),
  });

  const cashPayMutation = useMutation({
    mutationFn: () => paymentsApi.initiateTradeCash(id),
    onSuccess: (response: any) => {
      const data = response?.data?.data ?? response?.data ?? {};
      const paymentId = data.paymentId ?? data.id;
      if (!paymentId) {
        notify(t("trade.cashPay.missingPaymentId"));
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
    onError: (error: any) => {
      captureException(error, {
        level: "error",
        tags: { flow: "trade.cashPay" },
        extra: { tradeId: id },
      });
      notify(error?.response?.data?.message || t("payment.startFailed"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => tradesApi.cancel(id, t("trade.cancelledByUser")),
    onSuccess: () => {
      invalidate();
      notify(t("trade.tradeCancelled"));
    },
    onError: (error: any) =>
      notify(error.response?.data?.message || t("common.operationFailed")),
  });

  const disputeMutation = useMutation({
    mutationFn: () =>
      tradesApi.raiseDispute(id, {
        reason: disputeReason,
        description: disputeDescription.trim(),
      }),
    onSuccess: () => {
      invalidate();
      setDisputeVisible(false);
      setDisputeDescription("");
      notify(t("trade.dispute.successMessage"));
    },
    onError: (error: any) =>
      notify(error.response?.data?.message || t("trade.dispute.errorMessage")),
  });

  // --- Handler'lar (aksiyon butonlarından) ---
  const handleAccept = () => {
    if (!tradeAddressId) {
      appAlert(
        t("address.deliveryAddress"),
        t("trade.selectDeliveryAddress"),
      );
      return;
    }
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

  const submitDispute = () => {
    if (disputeDescription.trim().length < 10) {
      notify(t("trade.dispute.minLengthError"));
      return;
    }
    disputeMutation.mutate();
  };

  return {
    snackbar,
    notify,
    dismissSnackbar,
    // teslimat adresi
    setTradeAddressId,
    // reddet modal
    reject: {
      visible: rejectVisible,
      open: () => setRejectVisible(true),
      close: () => setRejectVisible(false),
      reason: rejectReason,
      setReason: setRejectReason,
      submit: () => rejectMutation.mutate(),
      isPending: rejectMutation.isPending,
    },
    // itiraz modal
    dispute: {
      visible: disputeVisible,
      open: () => setDisputeVisible(true),
      close: () => setDisputeVisible(false),
      reason: disputeReason,
      setReason: setDisputeReason,
      description: disputeDescription,
      setDescription: setDisputeDescription,
      submit: submitDispute,
      isPending: disputeMutation.isPending,
    },
    // aksiyonlar
    handleAccept,
    handleCancel,
    acceptPending: acceptMutation.isPending,
    cancelPending: cancelMutation.isPending,
    confirm: () => confirmMutation.mutate(),
    confirmPending: confirmMutation.isPending,
    cashPay: () => cashPayMutation.mutate(),
    cashPayPending: cashPayMutation.isPending,
    rejectPending: rejectMutation.isPending,
  };
}
