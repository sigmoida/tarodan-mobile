import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { authApi } from '@/lib/api';
import { unwrap } from '../_lib/types';

/**
 * 2FA açık mı (`GET /security/2fa/status`). Kaynak `TwoFactorSecret.isEnabled` — user nesnesinde
 * yok. Ulaşılamazsa kapalı varsayılır (web `use2faStatus` ile aynı); `retry: false` çünkü tek bir
 * hata "bilinmiyor" demek, tekrar denemek kullanıcıya bir şey kazandırmıyor.
 */
export function useTwoFactorStatus() {
  const query = useQuery({
    queryKey: qk.user.twoFactorStatus,
    retry: false,
    queryFn: async () => !!unwrap((await authApi.getTwoFactorStatus()).data).isEnabled,
  });
  return {
    isEnabled: query.data ?? false,
    isLoading: query.isLoading,
    /** Durum alınamadı: "kapalı" varsayımı GÖSTERİM içindir; kurulumu kendiliğinden başlatmaz. */
    isError: query.isError,
    refetch: query.refetch,
  };
}
