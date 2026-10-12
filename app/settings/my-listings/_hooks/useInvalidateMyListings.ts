import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";

/**
 * İlan durumu değişince tazelenecek küme — TEK yer (deaktif/aktif/sil/yenile
 * hepsi aynısını yapar). Liste + sayaçlar + profil istatistikleri + kullanıcı
 * (ilan sayısı üyelik limitini okur).
 */
export function useInvalidateMyListings() {
  const queryClient = useQueryClient();
  const { refreshUserData } = useAuthStore();
  return () => {
    queryClient.invalidateQueries({ queryKey: qk.products.myListingsAll });
    queryClient.invalidateQueries({ queryKey: qk.products.myListingsStats });
    queryClient.invalidateQueries({ queryKey: qk.user.statsAll });
    refreshUserData();
  };
}
