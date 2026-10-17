import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Başkasının (karşı taraf, satıcı, destek ekibi…) değiştirebildiği listeler için kısa tazelik
 * süresi: ekrana dönüşte veri bundan eskiyse sessizce tazelenir. Bildirimler listesiyle aynı
 * değer (`app/notifications/_hooks/useNotifications.ts`).
 */
export const FOCUS_LIST_STALE_MS = 30_000;

/**
 * Ekrana GERİ dönüldüğünde (odak) verilen sorguları yalnız BAYATSA ve arka planda tazeler.
 *
 * Eskiden ~17 ekran `useFocusEffect` içinde koşulsuz `refetch()` çağırıyordu: her odaklanmada
 * `staleTime` yok sayılıp istek atılıyor, ilk açılışta da sorgunun kendi yüklemesine ikinci bir
 * istek ekleniyordu. Burada:
 * - İLK odaklanma atlanır — o sırada sorgu zaten kendi mount yüklemesini yapıyor.
 * - `stale: true`: taze veride istek YOK (staleTime'a uyulur; yazma sonrası `invalidateQueries`
 *   sorguyu bayat işaretlediği için mutasyon sonrası dönüşte yine tazelenir).
 * - `type: 'active'`: yalnız etkin gözlemcisi olan sorgular (kapalı `enabled` istek atmaz).
 * - `cancelRefetch: false`: uçuştaki istek iptal edilip yinelenmez.
 * - Çekip-yenile göstergesi buna bağlı DEĞİL (o, kullanıcının elle tetiklediği `useRefresh`).
 *
 * Anahtarlar önek olarak eşleşir (`qk.orders.all` tüm sipariş listelerini kapsar).
 *
 * `maxAgeMs`: uzun `staleTime`'lı ama başkasının değiştirebildiği veri (ürün detayı: fiyat / stok /
 * durum) — bayat OLMASA da verisi bu süreden eskiyse dönüşte yine tazelenir.
 */
export function useRefetchStaleOnFocus(
  queryKeys: readonly QueryKey[],
  enabled = true,
  options: { maxAgeMs?: number } = {},
): void {
  const { maxAgeMs } = options;
  const queryClient = useQueryClient();
  // Anahtarlar çoğu zaman her render'da yeni dizi (`qk.x.detail(id)`) — odak etkisini yeniden
  // tetiklemesinler diye son değer ref'te tutulur.
  const latestKeys = useRef(queryKeys);
  useEffect(() => {
    latestKeys.current = queryKeys;
  });
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      for (const queryKey of latestKeys.current) {
        void queryClient.refetchQueries(
          maxAgeMs == null
            ? { queryKey, stale: true, type: 'active' }
            : {
                queryKey,
                type: 'active',
                predicate: (q) => q.isStale() || Date.now() - q.state.dataUpdatedAt > maxAgeMs,
              },
          { cancelRefetch: false },
        );
      }
    }, [enabled, queryClient, maxAgeMs]),
  );
}
