import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import type { BusinessStats, TabType } from "../_lib/types";

/**
 * İşletme paneli controller'ı — istatistik çekimi, oturum yönlendirmesi, sekme.
 *
 * React Query'ye taşındı (CLAUDE.md §6). Hata mesajı ayrımı korundu: 400
 * "bu özellik yalnız İşletme hesapları için" anlamına geliyor ve sunucunun
 * kendi metni gösteriliyor; diğer hatalar genel mesaja düşüyor.
 */
export function useBusinessStats() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/(auth)/login");
  }, [isAuthenticated]);

  const query = useQuery({
    queryKey: qk.user.businessStats,
    enabled: isAuthenticated,
    retry: false,
    queryFn: async (): Promise<BusinessStats> => {
      const response = await api.get("/users/me/business-stats");
      return response.data as BusinessStats;
    },
  });

  const error = query.error
    ? (query.error as any)?.response?.status === 400
      ? ((query.error as any)?.response?.data?.message ??
        (query.error as any)?.response?.data?.error ??
        "Bu özellik sadece İşletme hesapları için geçerlidir.")
      : "İstatistikler yüklenirken bir hata oluştu"
    : null;

  return {
    t,
    stats: query.data ?? null,
    loading: query.isLoading,
    error,
    activeTab,
    setActiveTab,
  };
}

export type BusinessController = ReturnType<typeof useBusinessStats>;
