import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { appAlert } from "@/ui";
import { productsApi, errorText, type ListingRemovalPayload } from "@/lib/api";
import { activationMessageKey } from "@/components/listing/_lib/activation";
import { useInvalidateMyListings } from "./useInvalidateMyListings";

/** Kaldırma nedeniyle birlikte giden istek (pasife alma / silme). */
export interface RemovalRequest {
  id: string;
  removal: ListingRemovalPayload;
}

/**
 * İlan durum mutasyonları: pasife al (neden ister), sil (neden ister), yeniden
 * aç. Her biri `appAlert` + invalidation'ın sahibidir. Pasife alma ve silme
 * çağrılırken kaldırma nedeni penceresi ZATEN kapanmıştır (iOS ModalFreeze).
 */
export function useListingMutations() {
  const { t } = useTranslation();
  const invalidate = useInvalidateMyListings();

  const deactivate = useMutation({
    mutationFn: ({ id, removal }: RemovalRequest) => productsApi.deactivate(id, removal),
    onSuccess: () => {
      invalidate();
      appAlert(t("common.success"), t("listing.deactivated"));
    },
    onError: (err) => {
      appAlert(t("common.error"), errorText(err, t("listing.deactivateFailed")));
    },
  });

  const remove = useMutation({
    mutationFn: ({ id, removal }: RemovalRequest) => productsApi.delete(id, removal),
    onSuccess: () => {
      invalidate();
      appAlert(t("common.success"), t("listing.deleted"));
    },
    onError: (err) => {
      appAlert(t("common.error"), errorText(err, t("listing.deleteFailed")));
    },
  });

  // Süresi dolmamış pasif ilanı (karantina dahil) yeniden aç: PATCH status=active.
  // Mesaj yanıttaki GERÇEK statüden gelir (karantinadaki ilan doğrudan active olur).
  const reactivate = useMutation({
    mutationFn: (listingId: string) => productsApi.update(listingId, { status: "active" }),
    onSuccess: (response) => {
      invalidate();
      appAlert(t("common.success"), t(activationMessageKey(response)));
    },
    onError: (err) => {
      appAlert(t("common.error"), errorText(err, t("listing.activateFailed")));
    },
  });

  return { deactivate, remove, reactivate };
}
