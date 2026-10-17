import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { createForegroundTracker } from '@/lib/query/focusManager';

/** Yenilenecek şey: bir sorgu anahtarı ya da çağıranın kendi `refetch`'i. */
export type ForegroundRefetchTarget = QueryKey | (() => unknown);

/**
 * Uygulama GERÇEKTEN ön plana döndüğünde (arka plandan → `active`) TEK bir
 * sorguyu staleTime'a BAKMADAN yeniden çeker. Zorunlu adımlar (onay kapısı;
 * kimlik adımı) metnin/durumun uygulama arka plandayken değişmiş olabileceği
 * için bunu kullanır.
 *
 * Global `focusManager` (bkz. `@/lib/query/focusManager`) artık AppState'e bağlı,
 * ama yalnız ESKİMİŞ (staleTime 5 dk) ekran sorgularını yeniler; bu hook verilen
 * hedefi her ön plana dönüşte zorlar. İkisi aynı anda tetiklenirse tek istek
 * gider (ikisi de `cancelRefetch: false`; uçuştaki istek paylaşılır).
 *
 * - iOS'ta `inactive` → `active` sayılmaz (`createForegroundTracker` — focusManager
 *   ile aynı kural): yalnız araya `background` girmişse yenilenir.
 * - Dinleyici `enabled`'dan bağımsız hep abonedir: devre dışıyken görülen bir
 *   arka plan geçişi (ör. Android'de Google giriş ekranı) sonradan, sorgu
 *   etkinleşince ikinci bir istek doğurmaz.
 * - Sorgu anahtarıyla verildiğinde yalnız etkin gözlemcisi olan sorgu
 *   yenilenir ve uçuştaki istek iptal edilmez (`cancelRefetch: false`):
 *   aynı anda ikinci istek gitmez.
 */
export function useRefetchOnForeground(
  target: ForegroundRefetchTarget,
  options: { enabled?: boolean } = {},
): void {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const latest = useRef({ target, enabled });
  useEffect(() => {
    latest.current = { target, enabled };
  });

  useEffect(() => {
    const track = createForegroundTracker();
    const sub = AppState.addEventListener('change', (next) => {
      if (track(next) !== 'foreground') return;
      const { target: current, enabled: on } = latest.current;
      if (!on) return;
      if (typeof current === 'function') void current();
      else
        void queryClient.refetchQueries(
          { queryKey: current, type: 'active' },
          { cancelRefetch: false },
        );
    });
    return () => sub.remove();
  }, [queryClient]);
}
