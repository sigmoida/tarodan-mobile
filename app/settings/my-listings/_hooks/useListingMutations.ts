import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { alertAfterClose, toast } from "@/ui";
import { productsApi, errorText, type ListingRemovalPayload } from "@/lib/api";
import { useAppMutation } from "@/lib/query";
import { activationMessageKey } from "@/components/listing/_lib/activation";
import { useInvalidateMyListings } from "./useInvalidateMyListings";

/** Kaldırma nedeniyle birlikte giden istek (pasife alma / silme). */
export interface RemovalRequest {
  id: string;
  removal: ListingRemovalPayload;
}

/**
 * Kaldırma nedeni penceresi `onSubmit`'ten ÖNCE kapanır; ama kapanış animasyonu
 * sürerken (hızlı bir hata yanıtında olduğu gibi) `appAlert` açmak iOS'ta donmaya
 * yol açar (CLAUDE.md §12). Hata uyarısı `alertAfterClose` ile modalın kapanma süresi
 * geçtikten sonra çıkar (kapatma işi çağıranda bittiği için `close` boş); başarı bilgisi
 * diyalog değil toast'tur.
 */
const noticeAfterRemovalModal = (title: string, message: string) =>
  alertAfterClose(() => {}, title, message);

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
    onSuccess: (_data, { id }) => {
      invalidate(id);
      toast.success(t("listing.deactivated"));
    },
    onError: (err) => {
      noticeAfterRemovalModal(t("common.error"), errorText(err, t("listing.deactivateFailed")));
    },
  });

  const remove = useMutation({
    mutationFn: ({ id, removal }: RemovalRequest) => productsApi.delete(id, removal),
    onSuccess: (_data, { id }) => {
      invalidate(id);
      toast.success(t("listing.deleted"));
    },
    onError: (err) => {
      noticeAfterRemovalModal(t("common.error"), errorText(err, t("listing.deleteFailed")));
    },
  });

  // Süresi dolmamış pasif ilanı (karantina dahil) yeniden aç: PATCH status=active.
  // Mesaj yanıttaki GERÇEK statüden gelir (karantinadaki ilan doğrudan active olur).
  const reactivate = useAppMutation(
    (listingId: string) => productsApi.update(listingId, { status: "active" }),
    {
      success: (response) => t(activationMessageKey(response)),
      error: t("listing.activateFailed"),
      onSuccess: (_response, listingId) => invalidate(listingId),
    },
  );

  return { deactivate, remove, reactivate };
}
