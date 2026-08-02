import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { USERNAME_PATTERN } from '../_lib/schema';

const DEBOUNCE_MS = 400;
const MIN_LEN = 3;
const MAX_LEN = 30;

export interface UsernameAvailability {
  /** Debounce bekleniyor veya sorgu sürüyor. */
  checking: boolean;
  /** Format geçersizken (veya henüz sorgu atılmadıysa) `undefined` — bilinmiyor
   *  demektir, bloklama YAPILMAZ. Yalnız kesin `false` gönderimi engellemeli. */
  available: boolean | undefined;
  /** 30/dk throttle'a takıldı — kullanıcıya bekleme mesajı göster, sessizce yeniden deneme. */
  isThrottled: boolean;
}

/**
 * Kullanıcı adı uygunluğu — debounce edilmiş (400ms) `GET /auth/username-availability`.
 *
 * ⚠️ Canlı tuzak: uç FORMAT doğrulaması YAPMAZ — `Gorkem` (büyük harfli) gibi
 * geçersiz bir girdi için bile `available:true` dönebilir. Bu yüzden sorgu YALNIZ
 * ham (case-sensitive) girdi `USERNAME_PATTERN`'i geçtiğinde atılır; büyük harfli
 * girdi hiçbir zaman ağa gitmeden reddedilmiş olur.
 */
export function useUsernameAvailability(rawUsername: string): UsernameAvailability {
  const [debounced, setDebounced] = useState(rawUsername);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawUsername), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawUsername]);

  const isValid = (v: string) => {
    const t = v.trim();
    return t.length >= MIN_LEN && t.length <= MAX_LEN && USERNAME_PATTERN.test(t);
  };

  const candidate = debounced.trim();
  const isValidFormat = isValid(candidate);
  const isRawValidFormat = isValid(rawUsername);

  const query = useQuery({
    queryKey: qk.auth.usernameAvailability(candidate),
    queryFn: async () => (await authApi.checkUsernameAvailability(candidate)).data,
    enabled: isValidFormat,
    staleTime: 30_000,
    retry: false,
  });

  const isThrottled =
    (query.error as { response?: { status?: number } } | null)?.response?.status === 429;

  return {
    // Debounce beklerken de "kontrol ediliyor" göster (format zaten geçerliyse);
    // format geçersizse (kısa/karakter dışı/büyük harf) hiçbir zaman true olmaz.
    checking: isRawValidFormat && (debounced !== rawUsername || query.isFetching),
    available: isValidFormat ? query.data?.available : undefined,
    isThrottled,
  };
}
