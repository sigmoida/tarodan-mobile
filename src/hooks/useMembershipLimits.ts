import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore, type ServerLimitsOverride } from '@/stores/authStore';

// NOT: `ServerLimitsOverride` store'da tanımlıdır. Bu hook zaten store'u
// import ettiği için tipi burada tanımlayıp store'a import ettirmek
// döngüsel bağımlılık yaratırdı.

/**
 * Sunucudan gelen ham hak zarfı (GET /membership/me/limits).
 *
 * **Ölçüldü (staging, 2026-08-03, kimlikli):** uç 13 alan döndürüyor —
 * `canCreateListing`, `canUseFreeSlot`, `canTrade`, `canCreateCollection`,
 * `isAdFree`, `maxImages`, `maxFreeListings`, `maxTotalListings`,
 * `remainingFreeListings`, `remainingTotalListings`, `remainingFeaturedSlots`,
 * `tierName`, `tierType`.
 *
 * Bunların istemcideki `MembershipLimits` karşılığı olan **beşinin beşi de**
 * aşağıda eşleniyor. Kalan alanlar ya türetilmiş sayaç (`remaining*`) ya da
 * istemcide zaten hesaplanan bilgi. `MembershipLimits`'in diğer 10 alanı
 * (`maxAddresses`, `maxSavedSearches`, `maxMessagesPerDay`, `listingExpireDays`,
 * `maxReviewChars`, `maxValuePerListing`, `canFeatureListings`, `canBulkUpload`,
 * `canScheduleListings`, `priorityInSearch`) sunucu tarafından **hiç
 * yayınlanmıyor** — public ayar ucu da boş (`{}`).
 *
 * Yani "sunucudan gelen alanları genişlet" diye bir iş YOK: gelen her şey
 * zaten okunuyor. Kalan 10 alanın istemci sabiti olması bilinçli bir durum;
 * değişmesi için önce backend'in bunları yayınlaması gerekir.
 */
export type ServerLimitsDto = {
  maxTotalListings?: number;
  maxImages?: number;
  canCreateCollection?: boolean;
  canTrade?: boolean;
  isAdFree?: boolean;
};

export function mapServerLimits(dto: ServerLimitsDto | null): ServerLimitsOverride | null {
  if (!dto) return null;
  const out: ServerLimitsOverride = {};
  if (dto.maxTotalListings !== undefined) out.maxListings = dto.maxTotalListings;
  if (dto.maxImages !== undefined) out.maxImagesPerListing = dto.maxImages;
  if (dto.canCreateCollection !== undefined) out.canCreateCollections = dto.canCreateCollection;
  if (dto.canTrade !== undefined) out.canTrade = dto.canTrade;
  if (dto.isAdFree !== undefined) out.isAdFree = dto.isAdFree;
  return out;
}

/**
 * Üyelik haklarının sunucu kaynağı. Sonucu authStore'a yazar; oradaki
 * `limits` alanı TIER_LIMITS üzerine bu değerlerle bindirilir. Böylece
 * `canPerformAction` / `shouldShowUpgradePrompt` / `getRemainingCount`
 * hiç değişmeden sunucu değerini okur.
 *
 * Fetch'i bu hook yapar, store yalnız sonucu tutar (CLAUDE.md §8).
 * Sunucuya ulaşılamazsa override yazılmaz — TIER_LIMITS yedek kalır.
 */
export function useMembershipLimits() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setServerLimits = useAuthStore((s) => s.setServerLimits);
  const limits = useAuthStore((s) => s.limits);

  const query = useQuery({
    queryKey: qk.membershipLimits.mine,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await membershipApi.getLimits();
        const raw = ((res.data as any)?.data ?? res.data ?? null) as ServerLimitsDto | null;
        return mapServerLimits(raw);
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (query.data) setServerLimits(query.data);
  }, [query.data, setServerLimits]);

  return { limits, isLoading: query.isLoading };
}
