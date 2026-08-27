import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRefresh } from "@/hooks/useRefresh";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import type { Analytics } from "../_lib/types";
import { isPremiumTier } from "../_lib/premium";

/**
 * Analytics controller — owns the seller-analytics query, focus refresh, and the
 * premium/auth flags. Lifted verbatim from the monolithic AnalyticsScreen.
 */
export function useAnalytics() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const timeRange = "7d";

  // `useAuthStore().limits` is the client's merged tier table (TIER_LIMITS
  // overlaid with server quotas) — it has no `tierType` field, so it can't
  // answer "is this account premium". `user.membershipTier` is the field
  // that actually carries the server's tier (extractMembershipTier reads it
  // straight off the API user object), matching the same domain as the
  // `/membership/me/limits` response's measured `tierType` field.
  const isPremium = isPremiumTier({ tierType: user?.membershipTier });

  // Fetch analytics
  const {
    data: analyticsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["analytics", timeRange],
    queryFn: async () => {
      const response = await api.get("/users/me/analytics", {
        params: { period: timeRange },
      });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const analytics: Analytics | null = analyticsData || null;

  const { refreshing, onRefresh } = useRefresh(refetch);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated]),
  );

  return {
    t,
    isAuthenticated,
    isPremium,
    isLoading,
    analytics,
    refreshing,
    onRefresh,
  };
}

export type AnalyticsController = ReturnType<typeof useAnalytics>;
