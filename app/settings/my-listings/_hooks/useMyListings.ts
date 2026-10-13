import { useState, useCallback, useMemo } from "react";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { theme, runAfterModalClose } from "@/ui";
import { CAN_BUY_DIGITAL, limitAlert } from "@/lib/purchases";
import { productsApi, type ListingRemovalPayload } from "@/lib/api";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import type { SellerRemovalAction } from "@/components/listing/_lib/removal";
import {
  EXPIRED_FILTER,
  isExpiredListing,
  matchesFilter,
  type Listing,
  type FilterType,
} from "../_lib/types";
import { useMyListingsQuery } from "./useMyListingsQuery";
import { useExpiredCount } from "./useExpiredCount";
import { useListingMutations } from "./useListingMutations";
import { useRenewListings, useListingSelection } from "./useRenewListings";

const { colors } = theme;

/** Seçim yalnız "Süresi dolan" sekmesinde: diğer sekmelerde SABİT boş dizi (her render'da yeni `[]` değil). */
const NONE: Listing[] = [];

/** Kaldırma nedeni penceresinin hedefi: hangi ilan, hangi eylem. */
export interface RemovalTarget {
  listing: Listing;
  action: SellerRemovalAction;
}

/**
 * My-listings controller — owns the listings + stats queries, focus refresh,
 * filter/modal state, quota derivation, and the action-menu dispatcher.
 * Durum mutasyonları `useListingMutations`, yenileme `useRenewListings`
 * içindedir; invalidation seti `useInvalidateMyListings`te TEK yerdedir.
 */
export function useMyListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, limits, refreshUserData } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenuListing, setActionMenuListing] = useState<Listing | null>(
    null,
  );
  // Hedef (ilan + eylem) pencere KAPANDIKTAN sonra da durur; yalnız `removalOpen`
  // düşer. Aksi halde kapanış animasyonunda pencere varsayılan "Sil" kipine dönüp
  // pasife alma ekranı kapanırken kırmızı "Evet, Sil" gösterirdi. Sonraki açılış üzerine yazar.
  const [removalTarget, setRemovalTarget] = useState<RemovalTarget | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const openRemoval = (target: RemovalTarget) => {
    setRemovalTarget(target);
    setRemovalOpen(true);
  };
  const [boostListing, setBoostListing] = useState<Listing | null>(null);
  const isPremiumUser = Boolean(
    (user as any)?.isPremium ||
    ((user as any)?.membership_type &&
      (user as any)?.membership_type !== "free"),
  );

  const { data: listingsData, isLoading, isError, refetch } = useMyListingsQuery(filter);
  // Süresi dolan sayısı HER sekmede banner'ı ve chip sayacını besler: `limit=1` +
  // `meta.total` (tüm listeyi çekmez, 100'de tavanlanmaz). Sekmenin kendi listesinden ayrı anahtar.
  const { data: expiredCount = 0, refetch: refetchExpired } = useExpiredCount();

  const listings: Listing[] = useMemo(() => listingsData || [], [listingsData]);

  // Chip sayaçları — AKTİF FİLTREDEN BAĞIMSIZ stabil kaynak (GET /products/my/stats).
  // Önceden sayaçlar o an çekili (filtrelenmiş + sayfalı) listeden hesaplanıyordu →
  // filtreye basınca değişiyor, çok ilanı olanda tavanlanıyordu. Artık tek sunucu agregatı.
  const { data: statsResp } = useQuery({
    queryKey: qk.products.myListingsStats,
    queryFn: () => productsApi.getMyStats(),
    retry: 1,
  });
  const statCounts = (statsResp?.data as any)?.counts ?? {};
  // İlan kotası tek doğru kaynaktan: GET /products/my/stats summary.
  // used = aktif+beklemede+rezerve (satılan/pasif sayılmaz), max = maxTotalListings, canCreate = sunucu kararı.
  const quotaSummary = (statsResp?.data as any)?.summary;
  const counts = {
    all: statCounts.all ?? 0,
    active: statCounts.active ?? 0,
    pending: statCounts.pending ?? 0,
    sold: statCounts.sold ?? 0,
    reserved: statCounts.reserved ?? 0,
    rejected: statCounts.rejected ?? 0,
    inactive: statCounts.inactive ?? 0,
    // Stats ucunda "süresi dolan" sayacı yok → `useExpiredCount` (meta.total).
    expired: expiredCount,
    deleted: statCounts.deleted ?? 0,
  };

  const { deactivate, remove, reactivate } = useListingMutations();
  const { renewOne, renewMany } = useRenewListings();

  // Odaklanma ve çek-yenile AYNI yoldan geçer. `cancelRefetch:false`: uçuştaki bir
  // istek varsa (ilk açılış, hızlı art arda tetik) onu iptal edip yeniden başlatmak
  // yerine ona katılır → anahtar başına tek istek.
  const refreshLists = () =>
    Promise.all([
      refetch({ cancelRefetch: false }),
      refetchExpired({ cancelRefetch: false }),
    ]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refreshLists();
      queryClient.invalidateQueries({ queryKey: qk.products.myListingsStats });
      refreshUserData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLists();
    queryClient.invalidateQueries({ queryKey: qk.products.myListingsStats });
    await refreshUserData();
    setRefreshing(false);
  };

  const filteredListings = useMemo(
    () => listings.filter((listing) => matchesFilter(listing, filter)),
    [listings, filter],
  );
  const isExpiredTab = filter === EXPIRED_FILTER;
  const selection = useListingSelection(isExpiredTab ? filteredListings : NONE);

  const listingLimit = quotaSummary?.max ?? (limits?.maxListings || 10);

  /** Yenileme/yeniden açma yeni bir aktif ilan sayılır: sunucu kotası (aktif sayım) baz alınır. */
  const quotaBlocksReopen = (afterMenuCloses: (fn: () => void) => void) => {
    if (quotaSummary?.canCreate !== false) return false;
    afterMenuCloses(() => limitAlert({
      title: t("listing.limitTitle"),
      message: CAN_BUY_DIGITAL
        ? t("listing.limitBody")
        : t("listing.limitReachedInfo", { count: listingLimit }),
      cancelLabel: t("common.cancel"),
      upgradeLabel: t("address.goPremium"),
      onUpgrade: () => router.push("/upgrade"),
    }));
    return true;
  };

  const handleMenuAction = (action: string, listing: Listing) => {
    setActionMenuListing(null);
    // Eylem menüsü bir Modal: onu kapatırken AYNI tick'te appAlert ya da başka
    // bir Modal açmak iOS'ta donmaya yol açıyor (CLAUDE.md §12). Uyarı/diyalog
    // açan adımlar menü kapandıktan sonra çalışır; yönlendirme ve mutation
    // hemen çalışabilir.
    const afterMenuCloses = runAfterModalClose;

    switch (action) {
      case "edit":
        router.push(`/listing/${listing.id}/edit`);
        break;
      case "view":
        router.push(`/product/${listing.id}`);
        break;
      case "deactivate":
        // Neden ZORUNLU sorulur (web ile aynı) — pasife alma nedenle birlikte gider.
        afterMenuCloses(() => openRemoval({ listing, action: "deactivate" }));
        break;
      case "activate":
        reactivate.mutate(listing.id);
        break;
      case "boost":
        afterMenuCloses(() => setBoostListing(listing));
        break;
      case "relist":
        if (quotaBlocksReopen(afterMenuCloses)) return;
        // Süresi dolan ilan /renew ile (içerik değişmediyse doğrudan yayına döner);
        // diğer pasif ilan (karantina dahil) PATCH status=active ile.
        if (isExpiredListing(listing)) renewOne.mutate(listing.id);
        else reactivate.mutate(listing.id);
        break;
      case "delete":
        afterMenuCloses(() => openRemoval({ listing, action: "delete" }));
        break;
    }
  };

  /** Kaldırma nedeni penceresi onayı — pencere mutasyondan ÖNCE kapanır (iOS ModalFreeze). */
  const submitRemoval = (removal: ListingRemovalPayload) => {
    if (!removalTarget) return;
    const { listing, action } = removalTarget;
    setRemovalOpen(false);
    if (action === "delete") remove.mutate({ id: listing.id, removal });
    else deactivate.mutate({ id: listing.id, removal });
  };

  const renewSelected = () => {
    const chosen = filteredListings.filter((l) => selection.selected.has(l.id));
    if (chosen.length === 0) return;
    renewMany.mutate(chosen.map((l) => ({ id: l.id, title: l.title })));
  };

  const currentCount =
    quotaSummary?.used ??
    listings.filter(
      (l) =>
        l.status === "active" ||
        l.status === "pending" ||
        l.status === "reserved",
    ).length;
  const canCreateNew =
    quotaSummary?.canCreate ??
    (listingLimit === -1 || currentCount < listingLimit);

  const progressColor =
    listingLimit === -1
      ? colors.primary[600]!
      : currentCount >= listingLimit
        ? colors.danger[600]!
        : currentCount >= listingLimit - 2
          ? colors.warning[600]!
          : colors.primary[600]!;

  return {
    t,
    filter,
    setFilter,
    refreshing,
    onRefresh,
    isLoading,
    isError,
    refetch,
    filteredListings,
    counts,
    // modals / selection
    actionMenuListing,
    setActionMenuListing,
    removalTarget,
    removalOpen,
    closeRemoval: () => setRemovalOpen(false),
    submitRemoval,
    boostListing,
    setBoostListing,
    isPremiumUser,
    // expired view
    isExpiredTab,
    expiredCount,
    selection,
    renewSelected,
    isRenewingMany: renewMany.isPending,
    // handlers
    handleMenuAction,
    // quota
    listingLimit,
    currentCount,
    canCreateNew,
    progressColor,
  };
}

export type MyListingsController = ReturnType<typeof useMyListings>;
