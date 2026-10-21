import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore, type ServerLimitsOverride } from '@/stores/authStore';

// NOT: `ServerLimitsOverride` store'da tanımlıdır. Bu hook zaten store'u
// import ettiği için tipi burada tanımlayıp store'a import ettirmek
// döngüsel bağımlılık yaratırdı.

/**
 * The raw entitlement envelope from the server (GET /membership/me/limits).
 *
 * **Measured (staging, 2026-08-03, signed in):** the route returns 13 fields:
 * `canCreateListing`, `canUseFreeSlot`, `canTrade`, `canCreateCollection`,
 * `isAdFree`, `maxImages`, `maxFreeListings`, `maxTotalListings`,
 * `remainingFreeListings`, `remainingTotalListings`, `remainingFeaturedSlots`,
 * `tierName`, `tierType`.
 *
 * **All five** of them that have a client `MembershipLimits` counterpart are
 * mapped below. The rest are derived counters (`remaining*`) or information the
 * client already computes. The later `maxSavedSearches` (saved-searches delta,
 * 2026-10-21) is mapped too. The other 9 fields of `MembershipLimits`
 * (`maxAddresses`, `maxMessagesPerDay`, `listingExpireDays`,
 * `maxReviewChars`, `maxValuePerListing`, `canFeatureListings`, `canBulkUpload`,
 * `canScheduleListings`, `priorityInSearch`) are **not served** by the server
 * at all; the public settings route is empty (`{}`) as well.
 *
 * So there is NO "map more server fields" task: everything served is already
 * read. The remaining 9 fields being client constants is deliberate; changing
 * that needs the backend to serve them first.
 */
export type ServerLimitsDto = {
  maxTotalListings?: number;
  maxImages?: number;
  canCreateCollection?: boolean;
  canTrade?: boolean;
  /** Sunucu belirlerse (admin kutusu) bool; belirlemezse `null`/yok. */
  isAdFree?: boolean | null;
  /** Effective tier's saved-search limit (0 to 1000). 0 is valid; there is no "unlimited" (-1). */
  maxSavedSearches?: number;
};

export function mapServerLimits(dto: ServerLimitsDto | null): ServerLimitsOverride | null {
  if (!dto) return null;
  const out: ServerLimitsOverride = {};
  if (dto.maxTotalListings !== undefined) out.maxListings = dto.maxTotalListings;
  if (dto.maxImages !== undefined) out.maxImagesPerListing = dto.maxImages;
  if (dto.canCreateCollection !== undefined) out.canCreateCollections = dto.canCreateCollection;
  if (dto.canTrade !== undefined) out.canTrade = dto.canTrade;
  // Reklamsızlık YALNIZ sunucu kararıdır: boolean gelirse ona uyulur; `null`/eksik
  // = "belirlenmedi" → `false` (reklam gösterilir; web ve üretimdeki davranışla
  // aynı). authStore'daki sabit tier tablosuna DÜŞÜLMEZ — aksi halde ücretli
  // üye sunucu hiçbir şey demediği halde sessizce reklamsız kalırdı.
  out.isAdFree = dto.isAdFree === true;
  // Saved-search limit: the server value only (no client table); a missing field stays missing.
  if (typeof dto.maxSavedSearches === 'number') out.maxSavedSearches = dto.maxSavedSearches;
  return out;
}

/**
 * Üyelik haklarının sunucu kaynağı. Sonucu authStore'a yazar; oradaki
 * `limits` alanı TIER_LIMITS üzerine bu değerlerle bindirilir. Böylece
 * `canPerformAction` / `shouldShowUpgradePrompt` / `getRemainingCount`
 * hiç değişmeden sunucu değerini okur.
 *
 * Fetch'i bu hook yapar, store yalnız sonucu tutar (src/stores/CLAUDE.md › Client state only).
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

  return {
    limits,
    isLoading: query.isLoading,
    /**
     * Uç yanıtlandı ama sunucu hakkı alınamadı (hata / boş gövde): `serverLimits`
     * hiç yazılmayacak. "Henüz yüklenmedi"den ayırt etmek için — beklemeyi
     * sonsuza uzatmasın (reklam kararı bu durumda varsayılana düşer).
     */
    settledWithoutLimits: query.isFetched && !query.data,
  };
}
