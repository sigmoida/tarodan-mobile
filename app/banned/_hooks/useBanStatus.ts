import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

export type BanStatus = { banned: boolean; reason: string | null };

const isBanError = (e: unknown): e is { response: { status: 403; data: { errorCode: 'USER_BANNED'; bannedReason?: unknown } } } => {
  const res = (e as { response?: { status?: number; data?: { errorCode?: unknown } } })?.response;
  return res?.status === 403 && res.data?.errorCode === 'USER_BANNED';
};

/**
 * Hesabın ban durumu ve nedeni — SUNUCUDAN. Neden eskiden rota parametresinden
 * (`/banned?reason=…`) okunuyordu: `tarodan://banned?reason=<metin>` biçimli bir link
 * uygulamada resmi "hesabınız askıya alındı" ekranında saldırganın metnini (oltalama:
 * "şu numarayı arayın", "şu siteye girin") gösterebiliyordu. Artık parametre yok sayılır.
 *
 * Banlı kullanıcının kimliği doğrulanmış her isteği (destek / çıkış hariç) `403 USER_BANNED`
 * + `bannedReason` döner (API `BannedUserGuard`); ekran bunu `GET /users/me` ile okur. İstek
 * BAŞARILI olursa hesap banlı değildir (`banned: false` — ekran ana sayfaya döner).
 * Oturum yoksa sorgu yok: sabit metin gösterilir. Önbelleğe alınmaz, yeniden denenmez.
 */
export function useBanStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: qk.auth.banStatus,
    enabled: isAuthenticated,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: async (): Promise<BanStatus> => {
      try {
        await userApi.getProfile();
        return { banned: false, reason: null };
      } catch (e) {
        if (!isBanError(e)) throw e;
        const raw = e.response.data.bannedReason;
        const reason = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
        return { banned: true, reason };
      }
    },
  });
}
