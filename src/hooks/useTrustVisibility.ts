import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/** /users/me yanıtının bu kancanın okuduğu alanları. */
type MeTrust = {
  isPremium?: boolean;
  trustScore?: number | null;
  trustLevel?: string | null;
  showTrustScore?: boolean;
};
type Envelope = { data?: MeTrust } & MeTrust;

/**
 * Güven skoru + herkese açık görünürlüğü (web `toggleTrustVisibility` paritesi).
 *
 * Kaynak sahibin kendi /users/me yanıtı: getPublicProfile sahibe de görünürlük kuralını uygular
 * (gizliyken trustScore=null) → anahtar kaybolurdu; owner endpoint'i skoru her zaman döndürür.
 * Anahtar yalnız premium profilde ve skor varken anlamlı (`canToggle`). Eskiden profil sekmesinin
 * başlığında çipti; şimdi Profili Düzenle'de bir Switch satırı.
 */
export function useTrustVisibility() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const key = qk.user.meTrust(user?.id ? String(user.id) : undefined);

  const { data: meProfile } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<MeTrust | null> => {
      const response = await userApi.getProfile();
      const body = response.data as Envelope | undefined;
      return body?.data ?? body ?? null;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const isPremiumProfile = !!meProfile?.isPremium;
  const trustScore: number | null =
    typeof meProfile?.trustScore === 'number' ? meProfile.trustScore : null;
  const trustLevel: string | null = meProfile?.trustLevel ?? null;
  const showTrustScore = meProfile?.showTrustScore !== false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => userApi.updateProfile({ showTrustScore: next }),
    // İyimser güncelleme: anahtar anında döner, hata olursa eski değere geri alınır.
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<MeTrust | null>(key);
      queryClient.setQueryData<MeTrust | null>(key, (old) => (old ? { ...old, showTrustScore: next } : old));
      return { prev };
    },
    onError: (_err, _next, context) => {
      if (context?.prev !== undefined) queryClient.setQueryData(key, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    canToggle: isPremiumProfile && trustScore != null,
    trustScore,
    trustLevel,
    showTrustScore,
    setShowTrustScore: (next: boolean) => mutation.mutate(next),
    isPending: mutation.isPending,
  };
}
