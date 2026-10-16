import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hesap alanı (kullanıcı adı / e-posta / fotoğraf) değiştikten sonra store'u taze
 * `GET /users/me` ile eşler ve kullanıcıya bağlı sorguları geçersiz kılar —
 * `isEmailVerified` gibi türetilmiş alanlar yalnız sunucudan gelir. Tazeleme
 * düşerse (null) çağıran tarafın önceden yazdığı `updateUser` değeri kalır.
 * Taze kullanıcıyı (ya da `null`) döndürür.
 */
export function useRefreshAccount() {
  const { refreshUserData } = useAuthStore();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    const fresh = await refreshUserData();
    queryClient.invalidateQueries({ queryKey: qk.user.all });
    return fresh;
  }, [refreshUserData, queryClient]);
}
