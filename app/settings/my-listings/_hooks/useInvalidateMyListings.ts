import { useQueryClient } from "@tanstack/react-query";
import { invalidateListingCaches } from "@/components/listing/_lib/invalidate";
import { useAuthStore } from "@/stores/authStore";

/**
 * İlan durumu değişince tazelenecek küme (deaktif/aktif/sil/yenile hepsi aynısını
 * yapar). Önbellek kümesi düzenleme formuyla ORTAK (`invalidateListingCaches`);
 * kullanıcı da yenilenir (ilan sayısı üyelik limitini okur).
 */
export function useInvalidateMyListings() {
  const queryClient = useQueryClient();
  const refreshUserData = useAuthStore((s) => s.refreshUserData);
  return (productId?: string) => {
    invalidateListingCaches(queryClient, productId);
    refreshUserData();
  };
}
