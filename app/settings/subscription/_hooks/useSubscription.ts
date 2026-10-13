import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appAlert, toast } from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { membershipApi, paymentsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/errorText";
import { qk } from "@/lib/query";
import { useTranslation } from "react-i18next";
import {
  isSubscriptionActive,
  getDaysUntilRenewal,
  getSubscriptionStatusText,
  type Subscription,
  type BillingHistory,
} from "../_lib/subscription";

/**
 * Subscription settings controller. Faz 1'de subscriptionStore (fetch eden
 * zustand) buraya, tek server-state disiplinine (TanStack Query) taşındı: abonelik
 * + fatura geçmişi query'leri, iptal/yeniden-aktifleştir mutation'ları, focus
 * refetch, snackbar ve türetilmiş premium/durum değerleri. Davranış korunur.
 */
export function useSubscription() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery<Subscription | null>({
    queryKey: qk.subscription.current,
    enabled: isAuthenticated,
    queryFn: async () => {
      try {
        const response = await membershipApi.getCurrentMembership();
        return (response.data as any)?.data ?? response.data ?? null;
      } catch {
        // Abonelik yoksa null (ücretsiz kademe).
        return null;
      }
    },
  });

  const billingQuery = useQuery<BillingHistory[]>({
    queryKey: qk.subscription.billing,
    enabled: isAuthenticated,
    queryFn: async () => {
      try {
        // Backend'de henüz billing-history endpoint'i yok. Geçici olarak ödemelerden çek.
        const response = await paymentsApi.getMyPayments({
          status: "paid",
          limit: 50,
        });
        const list = (response.data as any)?.data ?? response.data ?? [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });

  const subscription = subscriptionQuery.data ?? null;
  const billingHistory = billingQuery.data ?? [];
  const isLoading = subscriptionQuery.isLoading;

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        subscriptionQuery.refetch();
        billingQuery.refetch();
      }
    }, [isAuthenticated]),
  );

  const cancelMutation = useMutation({
    mutationFn: () => membershipApi.cancel(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.subscription.current,
      });
      toast.success(t('membership.cancelled'));
    },
    onError: (error: any) => {
      toast.error(apiErrorMessage(error, t('membership.cancelFailed')));
    },
  });

  const reactivateMutation = useMutation({
    // Backend'de "reactivate" endpoint'i yok; auto-renew açma ile benzer davranış.
    mutationFn: () => membershipApi.setAutoRenew(true),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.subscription.current,
      });
      toast.success(t('membership.reactivated'));
    },
    onError: (error: any) => {
      toast.error(apiErrorMessage(error, t('membership.reactivateFailed')));
    },
  });

  const handleCancel = () => {
    appAlert(
      t('membership.cancelTitle'),
      t('membership.cancelConfirm'),
      [
        { text: t('discount.discard'), style: 'cancel' },
        {
          text: t('payment.cancelAction'),
          style: "destructive",
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  };

  const handleReactivate = () => reactivateMutation.mutate();

  // Web ile aynı mantık (profile/membership/page.tsx): yalnızca AKTİF ve ücretli
  // (free olmayan) üyelik "premium" sayılır. Backend her kullanıcıya aktif bir
  // ücretsiz üyelik açtığı için (status=active, ~100 yıl geçerli), sadece
  // isSubscriptionActive() kontrolü TÜM kullanıcıları (ücretsiz dâhil) premium
  // gösteriyordu. Bu yüzden tier tipini de kontrol ediyoruz.
  const tierType = subscription?.tier?.type ?? "free";
  const isPremium =
    !!subscription && isSubscriptionActive(subscription) && tierType !== "free";
  const isCancelled = subscription?.status === "cancelled";
  const daysLeft = subscription ? getDaysUntilRenewal(subscription) : 0;
  const statusInfo = subscription
    ? getSubscriptionStatusText(t, subscription.status)
    : null;

  // Map status text color to a Chip variant
  const statusChipVariant:
    "neutral" | "success" | "warning" | "danger" | "info" = statusInfo
    ? subscription?.status === "active"
      ? "success"
      : subscription?.status === "cancelled"
        ? "warning"
        : subscription?.status === "past_due"
          ? "danger"
          : "neutral"
    : "neutral";

  return {
    t,
    isAuthenticated,
    subscription,
    billingHistory,
    isLoading,
    handleCancel,
    handleReactivate,
    isPremium,
    isCancelled,
    daysLeft,
    statusInfo,
    statusChipVariant,
  };
}

export type SubscriptionController = ReturnType<typeof useSubscription>;
