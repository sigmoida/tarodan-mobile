import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { USERNAME_PATTERN } from '@/utils/validation';

const DEBOUNCE_MS = 400;
const MIN_LEN = 3;
const MAX_LEN = 30;

export interface UsernameAvailability {
  /** Debounce bekleniyor veya sorgu sürüyor. */
  checking: boolean;
  /** Format geçersizken, henüz sorgu atılmadıysa VEYA sonuç yazılan değere ait
   *  değilken (debounce penceresi) `undefined` — bilinmiyor demektir, bloklama
   *  YAPILMAZ. Yalnız yazılan adın kendi kesin `false`'u gönderimi engeller. */
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
 * girdi hiçbir zaman ağa gitmeden reddedilmiş olur. (RegisterForm alanı zaten
 * girişte küçük harfe çeviriyor — buradaki kapı ikinci bariyer.)
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
  /** Sorgulanan aday, kullanıcının ŞU ANDA yazdığı değer mi? Debounce penceresinde
   *  değildir — o aralıkta `available` bir ÖNCEKİ adın sonucudur (bayat). */
  const isFresh = candidate === rawUsername.trim();

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
    // TAZELİK KAPISI: yalnız yazılan değerin kendi sonucu döner. Aksi halde
    // kullanıcı "alınmış" bir addan yeni bir ada geçtiğinde 400ms boyunca eski
    // `false` yeni ada yapışıyor, ekran kırmızı "alınmış" gösteriyor ve buton
    // kilitli kalıyordu (fail-open korunur: bilinmiyorsa `undefined`).
    available: isValidFormat && isFresh ? query.data?.available : undefined,
    // 429 uç geneli bir sinyal (ada özel değil) — tazelikle kapılanmaz.
    isThrottled,
  };
}
