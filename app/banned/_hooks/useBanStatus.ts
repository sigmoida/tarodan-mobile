import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { readAccessToken } from '@/lib/api/tokenStorage';
import { SESSION_PROBE } from '@/lib/api/sessionState';
import { qk } from '@/lib/query';

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
 * + `bannedReason` döner (API `BannedUserGuard`); ekran bunu `GET /users/me` ile okur.
 *
 * Saklı access token VARSA istek atılır — `isAuthenticated` beklenmez: görüntüsüz soğuk
 * açılışta (ertelenmiş oturum) arayüz misafirdir ama ban nedeni yine gösterilmeli. İstek
 * `SESSION_PROBE` ile gider (ertelenmiş oturumda da Bearer taşır).
 *  - `{ banned: true, reason }` → neden gösterilir;
 *  - `{ banned: false }` (istek başarılı) → hesap banlı değil, ekran ana sayfaya döner;
 *  - `null` → bilinmiyor (token yok / ağ): sabit metin. Önbelleğe alınmaz, yeniden denenmez.
 */
export function useBanStatus() {
  return useQuery({
    queryKey: qk.auth.banStatus,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: async (): Promise<BanStatus | null> => {
      let token: string | null = null;
      try {
        // Token okumasının tek kaynağı (açılış hazırlığı kapısı + yeniden kurulum bastırması dahil).
        token = await readAccessToken();
      } catch {
        return null;
      }
      if (!token) return null;
      try {
        await userApi.getProfile(SESSION_PROBE);
        return { banned: false, reason: null };
      } catch (e) {
        if (!isBanError(e)) return null;
        const raw = e.response.data.bannedReason;
        const reason = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
        return { banned: true, reason };
      }
    },
  });
}
